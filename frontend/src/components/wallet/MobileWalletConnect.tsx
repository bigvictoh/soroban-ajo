'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WalletIcon } from './WalletIcon'
import { ConnectionStatus, ConnectionState } from './ConnectionStatus'

import {
  mobileWalletService,
  isMobileDevice,
  getWalletInstallUrl,
  type MobileWalletType,
  type MobileWalletSession,
} from '@/utils/mobileWallet'

import type { MobileWalletInfo } from '@/types/wallet'

interface MobileWalletConnectProps {
  onConnect?: (session: MobileWalletSession) => void
  onDisconnect?: () => void
  onError?: (error: string) => void
  className?: string
}

const WALLET_INSTALL_URLS: Record<
  MobileWalletType,
  { ios: string; android: string; fallback: string }
> = {
  freighter_mobile: {
    ios: 'https://apps.apple.com/app/freighter-stellar-wallet/id1578328613',
    android: 'https://play.google.com/store/apps/details?id=org.stellar.freighter',
    fallback: 'https://freighter.app',
  },
  lobstr_mobile: {
    ios: 'https://apps.apple.com/app/lobstr-stellar-wallet/id1444286136',
    android: 'https://play.google.com/store/apps/details?id=com.lobstr.client',
    fallback: 'https://lobstr.co',
  },
}

export const MobileWalletConnect: React.FC<MobileWalletConnectProps> = ({
  onConnect,
  onDisconnect,
  onError,
  className = '',
}) => {
  const [session, setSession] = useState<MobileWalletSession | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [selectedWallet, setSelectedWallet] = useState<MobileWalletType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [availableWallets, setAvailableWallets] = useState<MobileWalletInfo[]>([])

  useEffect(() => {
    const mobile = isMobileDevice()
    setIsMobile(mobile)

    if (mobile) {
      const wallets = mobileWalletService.getAvailableWallets()
      setAvailableWallets(wallets)
    }

    const existingSession = mobileWalletService.getSession()
    if (existingSession) {
      setSession(existingSession)
      setConnectionState('success')
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const url = window.location.href
    if (url.includes('request_id') || url.includes('public_key') || url.includes('signed_xdr')) {
      handleCallback(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCallback = useCallback(
    async (url: string) => {
      try {
        const params = mobileWalletService.handleCallback(url)

        if (params.error) {
          setError(params.error)
          setConnectionState('error')
          onError?.(params.error)
          return
        }

        if (params.publicKey && params.requestId) {
          const walletType = params.requestId.includes('freighter')
            ? 'freighter_mobile'
            : 'lobstr_mobile'

          const newSession: MobileWalletSession = {
            publicKey: params.publicKey,
            walletType,
            connectedAt: Date.now(),
            network: 'testnet',
          }

          setSession(newSession)
          setConnectionState('success')
          onConnect?.(newSession)

          window.history.replaceState({}, document.title, window.location.pathname)
        }
      } catch (err: any) {
        setError(err.message || 'Callback handling failed')
        setConnectionState('error')
      }
    },
    [onConnect, onError]
  )

  const handleConnect = useCallback(
    async (walletType: MobileWalletType) => {
      setSelectedWallet(walletType)
      setConnectionState('connecting')
      setError(null)

      try {
        const result = await mobileWalletService.connect(walletType, {
          network: 'testnet',
        })

        if (result.success && result.publicKey) {
          const newSession: MobileWalletSession = {
            publicKey: result.publicKey,
            walletType,
            connectedAt: Date.now(),
            network: 'testnet',
          }

          setSession(newSession)
          setConnectionState('success')
          onConnect?.(newSession)
        } else {
          setError(result.error?.message || 'Connection failed')
          setConnectionState('error')
          onError?.(result.error?.message || 'Connection failed')
        }
      } catch (err: any) {
        setError(err.message || 'Connection failed')
        setConnectionState('error')
        onError?.(err.message || 'Connection failed')
      } finally {
        setSelectedWallet(null)
      }
    },
    [onConnect, onError]
  )

  const handleDisconnect = useCallback(() => {
    mobileWalletService.disconnect()
    setSession(null)
    setConnectionState('idle')
    setError(null)
    onDisconnect?.()
  }, [onDisconnect])

  if (!isMobile && typeof window !== 'undefined') {
    return (
      <div className={`p-6 bg-gray-50 dark:bg-gray-800 rounded-xl ${className}`}>
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="w-12 h-12 mx-auto text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Mobile Wallet Required
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Mobile wallet integration is available on mobile devices. Please open this page on your
            mobile device with Freighter or LOBSTR installed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Mobile Wallet Connection
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Connect using Freighter Mobile or LOBSTR mobile wallet
        </p>
      </div>

      <ConnectionStatus state={connectionState} message={error || undefined} />

      <AnimatePresence>
        {session && connectionState === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <WalletIcon
                  wallet={session.walletType === 'freighter_mobile' ? 'freighter' : 'lobstr'}
                  size={32}
                />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">
                    {session.walletType === 'freighter_mobile'
                      ? 'Freighter Mobile'
                      : 'LOBSTR Mobile'}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-mono mt-1">
                    {session.publicKey.slice(0, 8)}...{session.publicKey.slice(-8)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!session && (
        <div className="space-y-3">
          {availableWallets.map((wallet) => {
            const isFreighter = wallet.type === 'freighter_mobile'
            const baseWallet = isFreighter ? 'freighter' : 'lobstr'

            return (
              <motion.button
                key={wallet.type}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleConnect(wallet.type)}
                disabled={connectionState === 'connecting'}
                className={`w-full p-4 rounded-xl border transition-all duration-200 text-left
                  ${
                    connectionState === 'connecting' && selectedWallet === wallet.type
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500'
                  }
                  ${!wallet.isAvailable ? 'opacity-60 cursor-not-allowed' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <WalletIcon wallet={baseWallet} size={36} />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{wallet.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {wallet.isAvailable ? 'Tap to connect' : 'Not installed'}
                      </p>
                    </div>
                  </div>

                  {connectionState === 'connecting' && selectedWallet === wallet.type ? (
                    <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        wallet.isAvailable
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}
                    >
                      {wallet.isAvailable ? 'Available' : 'Install'}
                    </span>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      )}

      {!session && availableWallets.some((w) => !w.isAvailable) && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-3">
            Dont have a wallet installed?
          </p>
          <div className="space-y-2">
            {availableWallets
              .filter((w) => !w.isAvailable)
              .map((wallet) => {
                const installUrl = getWalletInstallUrl(
                  wallet.type === 'freighter_mobile' ? 'freighter' : 'lobstr'
                )

                return (
                  <a
                    key={wallet.type}
                    href={installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                  >
                    <span className="text-sm text-yellow-700 dark:text-yellow-400">
                      Install {wallet.name}
                    </span>
                    <svg
                      className="w-4 h-4 text-yellow-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )
              })}
          </div>
        </div>
      )}

      {!session && connectionState === 'idle' && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
            How to connect:
          </h4>
          <ol className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
            <li>Make sure you have Freighter or LOBSTR mobile app installed</li>
            <li>Tap on the wallet card above</li>
            <li>Approve the connection in your wallet app</li>
            <li>Youll be redirected back automatically</li>
          </ol>
        </div>
      )}
    </div>
  )
}

export default MobileWalletConnect
