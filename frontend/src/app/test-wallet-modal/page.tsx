'use client';

import { useState } from 'react';

export default function TestWalletModalPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string>('');

  const availableWallets = [
    {
      name: 'Freighter',
      provider: 'freighter',
      isInstalled: typeof window !== 'undefined' && !!(window as any).freighterApi,
      icon: '🚀',
      description: 'Browser extension',
    },
    {
      name: 'LOBSTR',
      provider: 'lobstr',
      isInstalled: typeof window !== 'undefined' && (!!(window as any).lobstrVault || !!(window as any).lobstr),
      icon: '🦞',
      description: 'Mobile app or Vault extension',
    },
    {
      name: 'Albedo',
      provider: 'albedo',
      isInstalled: typeof window !== 'undefined' && !!(window as any).albedo,
      icon: '⭐',
      description: 'Web-based wallet',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Test Wallet Selection Modal
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Wallet Detection Status
          </h2>
          <div className="space-y-2 text-sm">
            {availableWallets.map((wallet) => (
              <div key={wallet.provider} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="flex items-center gap-2">
                  <span className="text-xl">{wallet.icon}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{wallet.name}</span>
                </span>
                <span className={wallet.isInstalled ? 'text-green-600' : 'text-red-600'}>
                  {wallet.isInstalled ? '✅ Installed' : '❌ Not Installed'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
        >
          Open Wallet Selection Modal
        </button>

        {selectedWallet && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-green-800 dark:text-green-200">
              Selected: <strong>{selectedWallet}</strong>
            </p>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowModal(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md z-50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Select Wallet</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                {availableWallets.map((wallet) => (
                  <button
                    key={wallet.provider}
                    onClick={() => {
                      setSelectedWallet(wallet.name);
                      setShowModal(false);
                    }}
                    disabled={!wallet.isInstalled}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      wallet.isInstalled
                        ? 'border-gray-200 hover:border-blue-500 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 cursor-pointer'
                        : 'border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{wallet.icon}</span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{wallet.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {wallet.description}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {wallet.isInstalled ? '✓ Ready to connect' : '✗ Not installed'}
                          </p>
                        </div>
                      </div>
                      {wallet.isInstalled && (
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Don't have a wallet?</strong><br />
                  Install <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className="underline">Freighter</a>, <a href="https://lobstr.co" target="_blank" rel="noopener noreferrer" className="underline">LOBSTR</a>, or <a href="https://vault.lobstr.co" target="_blank" rel="noopener noreferrer" className="underline">Lobstr Vault</a>
                </p>
              </div>
            </div>
          </>
        )}

        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            Troubleshooting
          </h3>
          <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
            <li>• If you don't see LOBSTR in the modal, refresh the page</li>
            <li>• LOBSTR should appear even if not installed (marked as "Not installed")</li>
            <li>• Check the debug page: <a href="/debug-lobstr" className="underline">Debug LOBSTR</a></li>
            <li>• Make sure you've restarted the frontend server</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
