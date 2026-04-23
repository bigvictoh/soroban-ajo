/**
 * Mobile wallet connection and transaction signing service.
 * Handles Freighter Mobile and LOBSTR mobile wallet integration
 * via deep linking and callback handling.
 */

import {
  buildFreighterDeepLink,
  buildLobstrDeepLink,
  generateCallbackUrl,
  generateRequestId,
  storePendingRequest,
  consumePendingRequest,
  saveMobileSession,
  getMobileSession,
  clearMobileSession,
  parseDeepLinkCallback,
  isMobileDevice,
  detectMobileWalletBrowser,
  type MobileWalletSession,
  type DeepLinkParams,
  type MobileConnectionRequest,
} from './deepLink'

import type { WalletConnectionResult, WalletError, StellarNetwork } from '@/types/wallet'

// ── Types ──────────────────────────────────────────────────────────────────

export type MobileWalletType = 'freighter_mobile' | 'lobstr_mobile'

export interface MobileConnectOptions {
  network?: StellarNetwork
  onCallback?: (params: DeepLinkParams) => void
}

export interface MobileSignOptions {
  xdr: string
  network?: StellarNetwork
  walletType: MobileWalletType
  publicKey: string
}

export interface MobileWalletInfo {
  type: MobileWalletType
  name: string
  isAvailable: boolean
  deepLinkScheme: string
}

// ── Mobile Wallet Service ──────────────────────────────────────────────────

/**
 * Main service class for mobile wallet integration.
 * Handles connection, transaction signing, and session management
 * for Freighter Mobile and LOBSTR mobile wallets.
 */
class MobileWalletService {
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map()
  private pollingInterval: NodeJS.Timeout | null = null
  private currentRequestId: string | null = null

  // ── Connection ────────────────────────────────────────────────────────

  /**
   * Initiate a connection to a mobile wallet via deep linking.
   * On mobile devices, this will open the wallet app.
   * On desktop, it will show a QR code or instructions.
   *
   * @param walletType - The mobile wallet to connect to
   * @param options - Connection options
   * @returns Promise that resolves when the wallet responds
   */
  async connect(
    walletType: MobileWalletType,
    options: MobileConnectOptions = {}
  ): Promise<WalletConnectionResult> {
    const requestId = generateRequestId()
    this.currentRequestId = requestId

    const network = options.network ?? 'testnet'
    const callbackUrl = generateCallbackUrl(requestId)

    // Store the pending request
    const request: MobileConnectionRequest = {
      requestId,
      type: 'connect',
      callbackUrl,
      params: { network },
    }
    storePendingRequest(request)

    // Build the deep link
    let deepLink: string
    if (walletType === 'freighter_mobile') {
      deepLink = buildFreighterDeepLink({
        requestId,
        callbackUrl,
        network,
      })
    } else {
      deepLink = buildLobstrDeepLink({
        requestId,
        callbackUrl,
        network,
      })
    }

    // Detect if we're in a mobile wallet's in-app browser
    const walletBrowser = detectMobileWalletBrowser()
    if (walletBrowser) {
      return this.handleInAppBrowserConnection(walletBrowser, network)
    }

    // Open the deep link
    this.openDeepLink(deepLink)

    // Start polling for the callback
    return this.waitForCallback(requestId, walletType, network)
  }

  /**
   * Sign a transaction using a mobile wallet.
   *
   * @param options - Signing options including XDR and wallet type
   * @returns Signed XDR string
   */
  async signTransaction(options: MobileSignOptions): Promise<string> {
    const requestId = generateRequestId()
    this.currentRequestId = requestId

    const { xdr, network = 'testnet', walletType, publicKey } = options
    const callbackUrl = generateCallbackUrl(requestId)

    // Store the pending request
    const request: MobileConnectionRequest = {
      requestId,
      type: 'sign_transaction',
      callbackUrl,
      params: { xdr, network, publicKey },
    }
    storePendingRequest(request)

    // Build the deep link
    let deepLink: string
    if (walletType === 'freighter_mobile') {
      deepLink = buildFreighterDeepLink({
        requestId,
        callbackUrl,
        xdr,
        network,
      })
    } else {
      deepLink = buildLobstrDeepLink({
        requestId,
        callbackUrl,
        xdr,
        network,
      })
    }

    this.openDeepLink(deepLink)

    // Wait for the signed transaction callback
    return this.waitForSignedTransaction(requestId)
  }

  // ── In-App Browser Handling ──────────────────────────────────────────

  /**
   * Handle connection when running inside a wallet's in-app browser.
   * These browsers often inject the wallet API directly.
   */
  private async handleInAppBrowserConnection(
    walletType: 'freighter' | 'lobstr',
    network: StellarNetwork
  ): Promise<WalletConnectionResult> {
    try {
      let publicKey: string | null = null

      if (walletType === 'freighter') {
        const api = (window as any).freighterApi
        if (api) {
          // Request access if needed
          if (api.isAllowed) {
            const allowed = await api.isAllowed()
            if (!allowed && api.setAllowed) {
              await api.setAllowed()
            }
          }
          publicKey = await api.getPublicKey()
        }
      } else if (walletType === 'lobstr') {
        const api = (window as any).lobstrVault || (window as any).lobstr
        if (api) {
          publicKey = await api.getPublicKey()
        }
      }

      if (!publicKey) {
        throw new Error('Could not get public key from wallet browser')
      }

      const mobileType = walletType === 'freighter' ? 'freighter_mobile' : 'lobstr_mobile'
      const session: MobileWalletSession = {
        publicKey,
        walletType: mobileType,
        connectedAt: Date.now(),
        network,
      }
      saveMobileSession(session)

      this.emit('connected', { publicKey, walletType: mobileType })

      return {
        success: true,
        address: publicKey,
        publicKey,
      }
    } catch (err: any) {
      const error: WalletError = {
        code: 'MOBILE_CONNECTION_FAILED',
        message: err.message || 'Failed to connect via mobile wallet browser',
        walletType: walletType === 'freighter' ? 'freighter' : 'lobstr',
      }
      return { success: false, error }
    }
  }

  // ── Deep Link Opening ────────────────────────────────────────────────

  /**
   * Open a deep link, handling different platforms appropriately.
   */
  private openDeepLink(url: string): void {
    if (typeof window === 'undefined') return

    // Try to open the deep link
    // On mobile, this should open the wallet app
    // On desktop, this might show an error or QR code
    try {
      window.location.href = url
    } catch {
      // Fallback: open in new window/tab
      window.open(url, '_blank')
    }
  }

  // ── Callback Handling ─────────────────────────────────────────────────

  /**
   * Wait for a callback from the mobile wallet.
   * Polls localStorage for the callback data.
   */
  private async waitForCallback(
    requestId: string,
    walletType: MobileWalletType,
    network: StellarNetwork,
    timeoutMs: number = 300000 // 5 minutes
  ): Promise<WalletConnectionResult> {
    const startTime = Date.now()
    const pollInterval = 1000 // Check every second

    return new Promise((resolve) => {
      const checkCallback = () => {
        const elapsed = Date.now() - startTime

        if (elapsed > timeoutMs) {
          if (this.pollingInterval) {
            clearInterval(this.pollingInterval)
            this.pollingInterval = null
          }
          resolve({
            success: false,
            error: {
              code: 'MOBILE_CALLBACK_TIMEOUT',
              message: 'Mobile wallet connection timed out. Please try again.',
              walletType: walletType === 'freighter_mobile' ? 'freighter' : 'lobstr',
            },
          })
          return
        }

        // Check for callback data in localStorage
        const request = consumePendingRequest(requestId)
        if (request) {
          if (this.pollingInterval) {
            clearInterval(this.pollingInterval)
            this.pollingInterval = null
          }

          // Process the callback
          this.processConnectionCallback(request, walletType, network)
            .then(resolve)
            .catch((err) => {
              resolve({
                success: false,
                error: {
                  code: 'MOBILE_CALLBACK_ERROR',
                  message: err.message || 'Error processing mobile wallet callback',
                  walletType: walletType === 'freighter_mobile' ? 'freighter' : 'lobstr',
                },
              })
            })
          return
        }
      }

      // Start polling
      this.pollingInterval = setInterval(checkCallback, pollInterval)
      // Check immediately
      checkCallback()
    })
  }

  /**
   * Process the connection callback from a mobile wallet.
   */
  private async processConnectionCallback(
    request: MobileConnectionRequest,
    walletType: MobileWalletType,
    network: StellarNetwork
  ): Promise<WalletConnectionResult> {
    try {
      // Parse the callback URL to get the public key
      // The callback URL would have been stored with the public key
      const publicKey = request.params?.publicKey || request.params?.public_key

      if (!publicKey) {
        throw new Error('No public key received from mobile wallet')
      }

      const session: MobileWalletSession = {
        publicKey,
        walletType,
        connectedAt: Date.now(),
        network,
      }
      saveMobileSession(session)

      this.emit('connected', { publicKey, walletType })

      return {
        success: true,
        address: publicKey,
        publicKey,
      }
    } catch (err: any) {
      const error: WalletError = {
        code: 'MOBILE_CONNECTION_FAILED',
        message: err.message || 'Failed to process mobile wallet connection',
        walletType: walletType === 'freighter_mobile' ? 'freighter' : 'lobstr',
      }
      return { success: false, error }
    }
  }

  /**
   * Wait for a signed transaction callback.
   */
  private async waitForSignedTransaction(
    requestId: string,
    timeoutMs: number = 300000
  ): Promise<string> {
    const startTime = Date.now()
    const pollInterval = 1000

    return new Promise((resolve, reject) => {
      const checkCallback = () => {
        const elapsed = Date.now() - startTime

        if (elapsed > timeoutMs) {
          if (this.pollingInterval) {
            clearInterval(this.pollingInterval)
            this.pollingInterval = null
          }
          reject(new Error('Mobile wallet signing timed out'))
          return
        }

        const request = consumePendingRequest(requestId)
        if (request) {
          if (this.pollingInterval) {
            clearInterval(this.pollingInterval)
            this.pollingInterval = null
          }

          const signedXdr = request.params?.signedXdr || request.params?.signed_xdr
          if (!signedXdr) {
            reject(new Error('No signed transaction received from mobile wallet'))
            return
          }

          resolve(signedXdr)
        }
      }

      this.pollingInterval = setInterval(checkCallback, pollInterval)
      checkCallback()
    })
  }

  // ── Session Management ────────────────────────────────────────────────

  /**
   * Get the current mobile wallet session.
   */
  getSession(): MobileWalletSession | null {
    return getMobileSession()
  }

  /**
   * Check if a mobile wallet is currently connected.
   */
  isConnected(): boolean {
    return getMobileSession() !== null
  }

  /**
   * Disconnect the mobile wallet.
   */
  disconnect(): void {
    clearMobileSession()
    this.currentRequestId = null
    this.emit('disconnected', {})
  }

  /**
   * Get the public key of the connected mobile wallet.
   */
  getPublicKey(): string | null {
    const session = getMobileSession()
    return session?.publicKey ?? null
  }

  /**
   * Get the wallet type of the connected mobile wallet.
   */
  getWalletType(): MobileWalletType | null {
    const session = getMobileSession()
    return session?.walletType ?? null
  }

  // ── Wallet Availability ──────────────────────────────────────────────

  /**
   * Check if Freighter Mobile is likely installed.
   * On mobile devices, we attempt to detect via user agent or scheme.
   */
  isFreighterMobileAvailable(): boolean {
    if (typeof window === 'undefined') return false

    // Check if we're on a mobile device
    if (!isMobileDevice()) return false

    // Check user agent for Freighter
    const ua = navigator.userAgent.toLowerCase()
    return ua.includes('freighter') || /android|iphone|ipad/i.test(ua)
  }

  /**
   * Check if LOBSTR mobile is likely installed.
   */
  isLobstrMobileAvailable(): boolean {
    if (typeof window === 'undefined') return false

    if (!isMobileDevice()) return false

    const ua = navigator.userAgent.toLowerCase()
    return ua.includes('lobstr') || /android|iphone|ipad/i.test(ua)
  }

  /**
   * Get information about available mobile wallets.
   */
  getAvailableWallets(): MobileWalletInfo[] {
    return [
      {
        type: 'freighter_mobile',
        name: 'Freighter Mobile',
        isAvailable: this.isFreighterMobileAvailable(),
        deepLinkScheme: 'freighter://',
      },
      {
        type: 'lobstr_mobile',
        name: 'LOBSTR Mobile',
        isAvailable: this.isLobstrMobileAvailable(),
        deepLinkScheme: 'lobstr://',
      },
    ]
  }

  // ── Event System ─────────────────────────────────────────────────────

  /**
   * Subscribe to mobile wallet events.
   */
  on(event: 'connected' | 'disconnected' | 'callback', callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  /**
   * Unsubscribe from mobile wallet events.
   */
  off(event: 'connected' | 'disconnected' | 'callback', callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach((cb) => cb(data))
    }
  }

  // ── Callback Handler (for API routes) ───────────────────────────────

  /**
   * Handle a callback from a mobile wallet (called from API route).
   * This method is designed to be called from /api/mobile-wallet/callback.
   */
  handleCallback(url: string): DeepLinkParams {
    const params = parseDeepLinkCallback(url)

    // Store the callback data so the polling can pick it up
    if (params.requestId) {
      this.storeCallbackData(params.requestId, params)
    }

    this.emit('callback', params)
    return params
  }

  private storeCallbackData(requestId: string, params: DeepLinkParams): void {
    if (typeof window === 'undefined') return

    const key = `mobile_callback_${requestId}`
    localStorage.setItem(key, JSON.stringify(params))

    // Also update the pending request
    const pending = JSON.parse(localStorage.getItem('soroban_ajo_mobile_callback') ?? '{}')
    if (pending[requestId]) {
      pending[requestId].params = { ...pending[requestId].params, ...params }
      localStorage.setItem('soroban_ajo_mobile_callback', JSON.stringify(pending))
    }
  }
}

// ── Export Singleton ────────────────────────────────────────────────────────

export const mobileWalletService = new MobileWalletService()

// ── Mobile Wallet Detection Helper ────────────────────────────────────────

/**
 * Detect if the current environment supports mobile wallet integration.
 */
export function supportsMobileWallet(): boolean {
  if (typeof window === 'undefined') return false

  // Check if we're on a mobile device
  if (!isMobileDevice()) return false

  // Check if any mobile wallet is available
  const walletBrowser = detectMobileWalletBrowser()
  if (walletBrowser) return true

  // Check for deep link support
  const ua = navigator.userAgent.toLowerCase()
  const isAndroid = /android/i.test(ua)
  const isIOS = /iphone|ipad|ipod/i.test(ua)

  return isAndroid || isIOS
}

/**
 * Handle a mobile wallet callback URL.
 * Call this when the page loads with the callback URL.
 *
 * @param url - The full callback URL
 * @returns Parsed callback parameters
 */
export function handleMobileWalletCallback(url: string): DeepLinkParams {
  return mobileWalletService.handleCallback(url)
}
