import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { getRedisMetrics, warmCache, invalidatePattern, cacheDel } from '../services/cacheService'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Cache
 *   description: Redis cache management — stats, warming, invalidation
 */

/**
 * GET /api/cache/stats
 * Returns Redis performance metrics and hit rate.
 */
router.get(
  '/stats',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    const metrics = await getRedisMetrics()
    res.json({ success: true, data: metrics })
  })
)

/**
 * POST /api/cache/warm
 * Pre-populates Redis with active groups from the database.
 */
router.post(
  '/warm',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await warmCache()
    res.json({ success: true, data: result })
  })
)

/**
 * DELETE /api/cache/key/:key
 * Deletes a specific cache key.
 */
router.delete(
  '/key/:key',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await cacheDel(req.params.key)
    res.json({ success: true, data: { deleted } })
  })
)

/**
 * DELETE /api/cache/pattern
 * Invalidates all keys matching a glob pattern.
 * Body: { pattern: "group:*" }
 */
router.delete(
  '/pattern',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { pattern } = req.body ?? {}
    if (!pattern || typeof pattern !== 'string') {
      res.status(400).json({ success: false, error: 'pattern is required' })
      return
    }
    const deleted = await invalidatePattern(pattern)
    res.json({ success: true, data: { pattern, deleted } })
  })
)

export const cacheRouter = router
