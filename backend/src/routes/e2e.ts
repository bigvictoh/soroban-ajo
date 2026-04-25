/**
 * E2E Encryption Routes — Issue #611
 *
 * Endpoints for public key exchange and management.
 * Private keys never touch the server.
 */

import { Router, Response } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../middleware/auth'
import {
  publishPublicKey,
  getPublicKey,
  getGroupMemberKeys,
  deletePublicKey,
} from '../services/e2eKeyService'
import { createModuleLogger } from '../utils/logger'

const router = Router()
const logger = createModuleLogger('E2ERoutes')

const publishKeySchema = z.object({
  publicKeyJwk: z.object({
    kty: z.string(),
    crv: z.string(),
    x: z.string(),
    y: z.string(),
    key_ops: z.array(z.string()).optional(),
    ext: z.boolean().optional(),
  }),
  fingerprint: z.string().min(10),
})

// POST /api/e2e/keys — publish or rotate public key
router.post('/keys', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { publicKeyJwk, fingerprint } = publishKeySchema.parse(req.body)
    const record = await publishPublicKey(userId, publicKeyJwk as JsonWebKey, fingerprint)

    return res.status(201).json({
      userId: record.userId,
      fingerprint: record.fingerprint,
      publishedAt: record.publishedAt,
      rotatedAt: record.rotatedAt,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid key format', details: error.errors })
    }
    logger.error('[E2E] Publish key error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/e2e/keys/:userId — get a user's public key
router.get('/keys/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const record = await getPublicKey(userId)
    if (!record) return res.status(404).json({ error: 'Public key not found' })

    return res.json({
      userId: record.userId,
      publicKeyJwk: record.publicKeyJwk,
      fingerprint: record.fingerprint,
      publishedAt: record.publishedAt,
    })
  } catch (error) {
    logger.error('[E2E] Get key error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/e2e/keys/group/:groupId — get public keys for all group members
router.get('/keys/group/:groupId', async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params
    const keysMap = await getGroupMemberKeys(groupId)

    const keys: Record<string, { publicKeyJwk: JsonWebKey; fingerprint: string }> = {}
    keysMap.forEach((record, uid) => {
      keys[uid] = { publicKeyJwk: record.publicKeyJwk, fingerprint: record.fingerprint }
    })

    return res.json({ groupId, keys })
  } catch (error) {
    logger.error('[E2E] Get group keys error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/e2e/keys — delete own public key (GDPR)
router.delete('/keys', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    await deletePublicKey(userId)
    return res.json({ success: true })
  } catch (error) {
    logger.error('[E2E] Delete key error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export const e2eRouter = router
