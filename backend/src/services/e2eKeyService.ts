/**
 * E2E Key Service — Issue #611
 *
 * Manages public key storage and retrieval for E2E encryption.
 * Private keys never touch the server — only public keys (JWK) are stored.
 */

import { prisma } from '../config/database'
import { createModuleLogger } from '../utils/logger'

const logger = createModuleLogger('E2EKeyService')

export interface PublicKeyRecord {
  userId: string
  publicKeyJwk: JsonWebKey
  fingerprint: string
  publishedAt: Date
  rotatedAt?: Date
}

// In-memory store (replace with DB table in production migration)
const keyStore = new Map<string, PublicKeyRecord>()

/**
 * Publishes or updates a user's ECDH public key.
 * Called when the frontend generates or rotates a key pair.
 */
export async function publishPublicKey(
  userId: string,
  publicKeyJwk: JsonWebKey,
  fingerprint: string
): Promise<PublicKeyRecord> {
  const existing = keyStore.get(userId)
  const record: PublicKeyRecord = {
    userId,
    publicKeyJwk,
    fingerprint,
    publishedAt: existing?.publishedAt ?? new Date(),
    rotatedAt: existing ? new Date() : undefined,
  }
  keyStore.set(userId, record)
  logger.info(`Public key published for user ${userId} (fingerprint: ${fingerprint})`)
  return record
}

/**
 * Retrieves the public key for a given userId.
 * Returns null if the user has not published a key yet.
 */
export async function getPublicKey(userId: string): Promise<PublicKeyRecord | null> {
  return keyStore.get(userId) ?? null
}

/**
 * Retrieves public keys for multiple users at once (e.g., all group members).
 */
export async function getPublicKeys(userIds: string[]): Promise<Map<string, PublicKeyRecord>> {
  const result = new Map<string, PublicKeyRecord>()
  for (const id of userIds) {
    const record = keyStore.get(id)
    if (record) result.set(id, record)
  }
  return result
}

/**
 * Returns the public keys for all members of a group.
 */
export async function getGroupMemberKeys(groupId: string): Promise<Map<string, PublicKeyRecord>> {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  })
  return getPublicKeys(members.map((m) => m.userId))
}

/**
 * Deletes a user's public key (e.g., on account deletion for GDPR compliance).
 */
export async function deletePublicKey(userId: string): Promise<void> {
  keyStore.delete(userId)
  logger.info(`Public key deleted for user ${userId}`)
}
