'use client';

/**
 * E2EKeyManager — Issue #611
 *
 * UI component for managing E2E encryption keys:
 * displays fingerprint, allows key rotation, and shows encryption status.
 */

import React, { useState } from 'react';
import { Shield, RefreshCw, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { useE2EEncryption } from '@/hooks/useE2EEncryption';

interface Props {
  userId: string;
  onKeyPublished?: (jwk: JsonWebKey) => Promise<void>;
}

export function E2EKeyManager({ userId, onKeyPublished }: Props) {
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  const { isReady, fingerprint, rotateKeys, error } = useE2EEncryption({
    userId,
    onPublicKeyReady: onKeyPublished,
  });

  const copyFingerprint = async () => {
    if (!fingerprint) return;
    await navigator.clipboard.writeText(fingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRotate = async () => {
    setRotating(true);
    try {
      await rotateKeys();
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-indigo-500" />
        <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
          End-to-End Encryption
        </span>
        {isReady ? (
          <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-3 h-3" /> Active
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
            <AlertCircle className="w-3 h-3" /> Initializing…
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 mb-2">{error}</p>
      )}

      {isReady && fingerprint && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Key fingerprint</p>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono bg-gray-50 dark:bg-slate-700 px-2 py-1 rounded text-gray-700 dark:text-slate-300 flex-1 truncate">
              {fingerprint}
            </code>
            <button
              onClick={copyFingerprint}
              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
              title="Copy fingerprint"
              aria-label="Copy key fingerprint"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
            Verify this fingerprint with your contacts to confirm secure communication.
          </p>
        </div>
      )}

      <button
        onClick={handleRotate}
        disabled={!isReady || rotating}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw className={`w-3 h-3 ${rotating ? 'animate-spin' : ''}`} />
        {rotating ? 'Rotating…' : 'Rotate keys'}
      </button>
    </div>
  );
}
