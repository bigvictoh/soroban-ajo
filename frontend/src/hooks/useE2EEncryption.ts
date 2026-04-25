'use client';

/**
 * useE2EEncryption — Issue #611
 *
 * React hook for managing E2E encryption state: key generation,
 * public key publishing, and message encrypt/decrypt.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getOrCreateKeyPair,
  exportPublicKey,
  encryptMessage,
  decryptMessage,
  encryptGroupData,
  decryptGroupData,
  rotateKeyPair,
  getKeyFingerprint,
  type EncryptedPayload,
} from '@/services/e2eEncryptionService';

interface UseE2EEncryptionOptions {
  userId: string;
  /** Called when the public key is ready to be published to the backend */
  onPublicKeyReady?: (publicKeyJwk: JsonWebKey) => void;
}

interface UseE2EEncryptionReturn {
  isReady: boolean;
  publicKeyJwk: JsonWebKey | null;
  fingerprint: string | null;
  encrypt: (plaintext: string, recipientPublicKey: JsonWebKey) => Promise<EncryptedPayload>;
  decrypt: (payload: EncryptedPayload, senderPublicKey: JsonWebKey) => Promise<string>;
  encryptForGroup: (data: unknown, groupSecret: string) => Promise<EncryptedPayload>;
  decryptFromGroup: <T = unknown>(payload: EncryptedPayload, groupSecret: string) => Promise<T>;
  rotateKeys: () => Promise<void>;
  error: string | null;
}

export function useE2EEncryption({
  userId,
  onPublicKeyReady,
}: UseE2EEncryptionOptions): UseE2EEncryptionReturn {
  const [isReady, setIsReady] = useState(false);
  const [publicKeyJwk, setPublicKeyJwk] = useState<JsonWebKey | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        const jwk = await exportPublicKey(userId);
        const fp = await getKeyFingerprint(jwk);
        if (cancelled) return;
        setPublicKeyJwk(jwk);
        setFingerprint(fp);
        setIsReady(true);
        onPublicKeyReady?.(jwk);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Key init failed');
      }
    })();

    return () => { cancelled = true; };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const encrypt = useCallback(
    (plaintext: string, recipientPublicKey: JsonWebKey) =>
      encryptMessage(plaintext, userId, recipientPublicKey),
    [userId]
  );

  const decrypt = useCallback(
    (payload: EncryptedPayload, senderPublicKey: JsonWebKey) =>
      decryptMessage(payload, userId, senderPublicKey),
    [userId]
  );

  const encryptForGroup = useCallback(
    (data: unknown, groupSecret: string) => encryptGroupData(data, groupSecret),
    []
  );

  const decryptFromGroup = useCallback(
    <T = unknown>(payload: EncryptedPayload, groupSecret: string) =>
      decryptGroupData<T>(payload, groupSecret),
    []
  );

  const rotateKeys = useCallback(async () => {
    try {
      const newJwk = await rotateKeyPair(userId);
      const fp = await getKeyFingerprint(newJwk);
      setPublicKeyJwk(newJwk);
      setFingerprint(fp);
      onPublicKeyReady?.(newJwk);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Key rotation failed');
    }
  }, [userId, onPublicKeyReady]);

  return {
    isReady,
    publicKeyJwk,
    fingerprint,
    encrypt,
    decrypt,
    encryptForGroup,
    decryptFromGroup,
    rotateKeys,
    error,
  };
}
