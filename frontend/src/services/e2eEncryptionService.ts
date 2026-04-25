/**
 * E2E Encryption Service — Issue #611
 *
 * Provides end-to-end encryption for sensitive group data and chat messages
 * using the Web Crypto API (ECDH key exchange + AES-GCM symmetric encryption).
 *
 * Key lifecycle:
 *  1. Each user generates an ECDH key pair on first use.
 *  2. The public key is published to the backend.
 *  3. Shared secrets are derived per (sender, recipient) pair via ECDH.
 *  4. Messages/data are encrypted with AES-GCM using the shared secret.
 *  5. Private keys never leave the device — stored in IndexedDB via the
 *     Web Crypto non-extractable key format.
 */

const DB_NAME = 'ajo-e2e-keys'
const DB_VERSION = 1
const STORE_NAME = 'keypairs'

// ── IndexedDB helpers ─────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).put(value, key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// ── Encoding helpers ──────────────────────────────────────────────────────

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = hex.match(/.{1,2}/g) ?? []
  return new Uint8Array(bytes.map((b) => parseInt(b, 16)))
}

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function base64ToBuf(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

// ── Key pair management ───────────────────────────────────────────────────

export interface E2EKeyPair {
  publicKeyJwk: JsonWebKey
  /** Private key stored as non-extractable CryptoKey — never serialised */
  privateKey: CryptoKey
}

/**
 * Generates or retrieves the local ECDH key pair for the given userId.
 * The private key is stored in IndexedDB and is non-extractable.
 */
export async function getOrCreateKeyPair(userId: string): Promise<E2EKeyPair> {
  const stored = await idbGet<{ publicKeyJwk: JsonWebKey; privateKey: CryptoKey }>(
    `keypair:${userId}`
  )
  if (stored) return stored

  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false, // private key is non-extractable
    ['deriveKey']
  )

  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  const entry = { publicKeyJwk, privateKey: keyPair.privateKey }
  await idbSet(`keypair:${userId}`, entry)
  return entry
}

/**
 * Exports the public key as a JWK for publishing to the backend.
 */
export async function exportPublicKey(userId: string): Promise<JsonWebKey> {
  const { publicKeyJwk } = await getOrCreateKeyPair(userId)
  return publicKeyJwk
}

/**
 * Derives a shared AES-GCM key from the local private key and a remote public key JWK.
 * The derived key is cached in memory for the session.
 */
const sharedKeyCache = new Map<string, CryptoKey>()

export async function deriveSharedKey(
  localUserId: string,
  remotePublicKeyJwk: JsonWebKey
): Promise<CryptoKey> {
  const cacheKey = `${localUserId}:${remotePublicKeyJwk.x}:${remotePublicKeyJwk.y}`
  if (sharedKeyCache.has(cacheKey)) return sharedKeyCache.get(cacheKey)!

  const { privateKey } = await getOrCreateKeyPair(localUserId)
  const remotePublicKey = await crypto.subtle.importKey(
    'jwk',
    remotePublicKeyJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: remotePublicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  sharedKeyCache.set(cacheKey, sharedKey)
  return sharedKey
}

// ── Encrypt / Decrypt ─────────────────────────────────────────────────────

export interface EncryptedPayload {
  /** Hex-encoded ciphertext */
  ciphertext: string
  /** Hex-encoded 12-byte IV */
  iv: string
  /** ISO timestamp for key rotation auditing */
  encryptedAt: string
}

/**
 * Encrypts a plaintext string using the shared key derived from ECDH.
 */
export async function encryptMessage(
  plaintext: string,
  localUserId: string,
  remotePublicKeyJwk: JsonWebKey
): Promise<EncryptedPayload> {
  const sharedKey = await deriveSharedKey(localUserId, remotePublicKeyJwk)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sharedKey, encoded)

  return {
    ciphertext: bufToHex(cipherBuf),
    iv: bufToHex(iv),
    encryptedAt: new Date().toISOString(),
  }
}

/**
 * Decrypts an EncryptedPayload using the shared key.
 */
export async function decryptMessage(
  payload: EncryptedPayload,
  localUserId: string,
  remotePublicKeyJwk: JsonWebKey
): Promise<string> {
  const sharedKey = await deriveSharedKey(localUserId, remotePublicKeyJwk)
  const cipherBytes = hexToBuf(payload.ciphertext)
  const iv = hexToBuf(payload.iv)

  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sharedKey, cipherBytes)
  return new TextDecoder().decode(plainBuf)
}

// ── Group data encryption (symmetric, group-scoped key) ───────────────────

/**
 * Derives a deterministic AES-GCM key for a group from the group secret.
 * The group secret is a shared value distributed to members out-of-band
 * (e.g., via ECDH-encrypted delivery to each member).
 */
export async function deriveGroupKey(groupSecret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(groupSecret),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('ajo-group-v1'), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypts sensitive group data (e.g., member wallet addresses, contribution amounts)
 * using a group-scoped symmetric key.
 */
export async function encryptGroupData(
  data: unknown,
  groupSecret: string
): Promise<EncryptedPayload> {
  const key = await deriveGroupKey(groupSecret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(data))
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

  return {
    ciphertext: bufToHex(cipherBuf),
    iv: bufToHex(iv),
    encryptedAt: new Date().toISOString(),
  }
}

/**
 * Decrypts group data encrypted with encryptGroupData.
 */
export async function decryptGroupData<T = unknown>(
  payload: EncryptedPayload,
  groupSecret: string
): Promise<T> {
  const key = await deriveGroupKey(groupSecret)
  const cipherBytes = hexToBuf(payload.ciphertext)
  const iv = hexToBuf(payload.iv)
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes)
  return JSON.parse(new TextDecoder().decode(plainBuf)) as T
}

// ── Key rotation ──────────────────────────────────────────────────────────

/**
 * Rotates the local ECDH key pair for a user.
 * The old key pair is replaced; callers must re-publish the new public key.
 */
export async function rotateKeyPair(userId: string): Promise<JsonWebKey> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey']
  )
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  await idbSet(`keypair:${userId}`, { publicKeyJwk, privateKey: keyPair.privateKey })
  // Clear cached shared keys so they are re-derived with the new key pair
  sharedKeyCache.clear()
  return publicKeyJwk
}

// ── Fingerprint (key verification) ───────────────────────────────────────

/**
 * Returns a short human-readable fingerprint of a public key JWK for
 * out-of-band verification (e.g., display in UI for user to confirm).
 */
export async function getKeyFingerprint(publicKeyJwk: JsonWebKey): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(publicKeyJwk))
  const hashBuf = await crypto.subtle.digest('SHA-256', encoded)
  const hex = bufToHex(hashBuf)
  // Format as groups of 4 for readability: ABCD:EFGH:...
  return (hex.match(/.{4}/g) ?? []).slice(0, 8).join(':').toUpperCase()
}
