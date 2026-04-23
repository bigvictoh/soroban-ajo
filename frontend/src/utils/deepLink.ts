/**
 * Deep linking utilities for mobile wallet integration.
 * Supports Freighter Mobile and LOBSTR mobile wallet connections
 * via URI schemes and universal links.
 */

// ── URI Scheme Constants ──────────────────────────────────────────────────────

export const DEEP_LINK_SCHEMES = {
  freighter: 'freighter',
  lobstr: 'lobstr',
} as const

export const UNIVERSAL_LINKS = {
  freighter: 'https://freighter.app/connect',
  lobstr: 'https://lobstr.co/connect',
} as const

// ── Callback Storage Key ─────────────────────────────────────────────────────

const CALLBACK_STORAGE_KEY = 'soroban_ajo_mobile_callback'
const MOBILE_SESSION_KEY = 'soroban_ajo_mobile_session'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeepLinkParams {
  /** The public key returned by the wallet */
  publicKey?: string
  /** Transaction XDR returned after signing */
  signedXdr?: string
  /** Error message if the operation failed */
  error?: string
  /** Callback URL to return to the app */
  callbackUrl?: string
  /** Unique request ID to match responses */
  requestId?: string
}

export interface MobileConnectionRequest {
  requestId: string
  type: 'connect' | 'sign_transaction'
  callbackUrl: string
  params?: Record<string, string>
}

// ── Deep Link Builders ───────────────────────────────────────────────────────

/**
 * Build a Freighter Mobile deep link for connection or transaction signing.
 *
 * @param params - Connection or signing parameters
 * @returns Freighter-compatible deep link URL
 */
export function buildFreighterDeepLink(params: {
  requestId: string
  callbackUrl: string
  publicKey?: string
  xdr?: string
  network?: 'testnet' | 'mainnet' | 'futurenet'
}): string {
  const url = new URL('freighter://xdr')

  url.searchParams.set('callback', params.callbackUrl)
  url.searchParams.set('request_id', params.requestId)

  if (params.xdr) {
    url.searchParams.set('xdr', params.xdr)
  }

  if (params.network) {
    url.searchParams.set('network', params.network)
  }

  return url.toString()
}

/**
 * Build a LOBSTR mobile deep link for connection or transaction signing.
 *
 * @param params - Connection or signing parameters
 * @returns LOBSTR-compatible deep link URL
 */
export function buildLobstrDeepLink(params: {
  requestId: string
  callbackUrl: string
  xdr?: string
  network?: 'testnet' | 'mainnet' | 'futurenet'
}): string {
  const url = new URL('lobstr://xdr')

  url.searchParams.set('callback', params.callbackUrl)
  url.searchParams.set('request_id', params.requestId)

  if (params.xdr) {
    url.searchParams.set('xdr', params.xdr)
  }

  if (params.network) {
    url.searchParams.set('network', params.network)
  }

  return url.toString()
}

// ── Callback URL Management ──────────────────────────────────────────────────

/**
 * Generate the callback URL that mobile wallets will return to.
 * Uses the current origin plus a special callback path.
 *
 * @param requestId - Unique identifier for this request
 * @returns Full callback URL
 */
export function generateCallbackUrl(requestId: string): string {
  if (typeof window === 'undefined') return ''

  const base = window.location.origin
  return `${base}/api/mobile-wallet/callback?request_id=${encodeURIComponent(requestId)}`
}

/**
 * Store callback information for a pending mobile wallet request.
 *
 * @param request - The pending request details
 */
export function storePendingRequest(request: MobileConnectionRequest): void {
  if (typeof window === 'undefined') return

  const pending = getPendingRequests()
  pending[request.requestId] = request
  localStorage.setItem(CALLBACK_STORAGE_KEY, JSON.stringify(pending))
}

/**
 * Retrieve and clear a pending request by its ID.
 *
 * @param requestId - The request ID to retrieve
 * @returns The stored request or null
 */
export function consumePendingRequest(requestId: string): MobileConnectionRequest | null {
  if (typeof window === 'undefined') return null

  const pending = getPendingRequests()
  const request = pending[requestId] ?? null
  if (request) {
    delete pending[requestId]
    localStorage.setItem(CALLBACK_STORAGE_KEY, JSON.stringify(pending))
  }
  return request
}

function getPendingRequests(): Record<string, MobileConnectionRequest> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(CALLBACK_STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

// ── Mobile Session Management ────────────────────────────────────────────────

export interface MobileWalletSession {
  publicKey: string
  walletType: 'freighter_mobile' | 'lobstr_mobile'
  connectedAt: number
  network: 'testnet' | 'mainnet' | 'futurenet'
}

/**
 * Save a mobile wallet session to localStorage.
 */
export function saveMobileSession(session: MobileWalletSession): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(MOBILE_SESSION_KEY, JSON.stringify(session))
}

/**
 * Retrieve the current mobile wallet session.
 */
export function getMobileSession(): MobileWalletSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(MOBILE_SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as MobileWalletSession
  } catch {
    return null
  }
}

/**
 * Clear the mobile wallet session.
 */
export function clearMobileSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(MOBILE_SESSION_KEY)
}

// ── URL Parameter Parsing ────────────────────────────────────────────────────

/**
 * Parse deep link response parameters from a URL.
 * Handles both query string and hash-based callbacks.
 *
 * @param url - The callback URL to parse
 * @returns Parsed deep link parameters
 */
export function parseDeepLinkCallback(url: string): DeepLinkParams {
  try {
    const parsed = new URL(url)

    const params: DeepLinkParams = {}

    // Check query string
    params.publicKey =
      parsed.searchParams.get('public_key') ?? parsed.searchParams.get('publicKey') ?? undefined
    params.signedXdr =
      parsed.searchParams.get('signed_xdr') ?? parsed.searchParams.get('signedXdr') ?? undefined
    params.error = parsed.searchParams.get('error') ?? undefined
    params.callbackUrl =
      parsed.searchParams.get('callback') ?? parsed.searchParams.get('callbackUrl') ?? undefined
    params.requestId =
      parsed.searchParams.get('request_id') ?? parsed.searchParams.get('requestId') ?? undefined

    // Check hash fragment (some wallets use hash-based callbacks)
    if (parsed.hash) {
      const hashParams = new URLSearchParams(parsed.hash.slice(1))
      params.publicKey ??= hashParams.get('public_key') ?? hashParams.get('publicKey') ?? undefined
      params.signedXdr ??= hashParams.get('signed_xdr') ?? hashParams.get('signedXdr') ?? undefined
      params.error ??= hashParams.get('error') ?? undefined
    }

    return params
  } catch {
    return {}
  }
}

// ── Mobile Detection ─────────────────────────────────────────────────────────

/**
 * Detect if the current device is a mobile device.
 * Used to determine whether to show mobile wallet options.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false

  const userAgent = navigator.userAgent.toLowerCase()
  const isMobileUA = /android|iphone|ipad|ipod|mobile|tablet/i.test(userAgent)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  return isMobileUA || (isTouchDevice && window.innerWidth < 768)
}

/**
 * Detect if the current browser is a supported mobile wallet browser.
 * Some mobile wallets inject their API into their in-app browser.
 */
export function detectMobileWalletBrowser(): 'freighter' | 'lobstr' | null {
  if (typeof window === 'undefined') return null

  const ua = navigator.userAgent.toLowerCase()

  if (ua.includes('freighter') || !!(window as any).freighterApi) {
    return 'freighter'
  }

  if (ua.includes('lobstr') || !!(window as any).lobstrVault || !!(window as any).lobstr) {
    return 'lobstr'
  }

  return null
}

// ── Wallet App Installation URLs ─────────────────────────────────────────────

export const WALLET_INSTALL_URLS = {
  freighter: {
    ios: 'https://apps.apple.com/app/freighter-stellar-wallet/id1578328613',
    android: 'https://play.google.com/store/apps/details?id=org.stellar.freighter',
    fallback: 'https://freighter.app',
  },
  lobstr: {
    ios: 'https://apps.apple.com/app/lobstr-stellar-wallet/id1444286136',
    android: 'https://play.google.com/store/apps/details?id=com.lobstr.client',
    fallback: 'https://lobstr.co',
  },
} as const

/**
 * Get the appropriate app store URL for the current platform.
 */
export function getWalletInstallUrl(
  wallet: 'freighter' | 'lobstr',
  platform?: 'ios' | 'android'
): string {
  const urls = WALLET_INSTALL_URLS[wallet]

  if (!platform && typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/i.test(ua)) {
      platform = 'ios'
    } else if (/android/i.test(ua)) {
      platform = 'android'
    }
  }

  return platform ? urls[platform] : urls.fallback
}

// ── Request ID Generation ────────────────────────────────────────────────────

/**
 * Generate a unique request ID for tracking mobile wallet requests.
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `req_${timestamp}_${random}`
}
