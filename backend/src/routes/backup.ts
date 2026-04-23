import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { backupService } from '../services/backupService'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Backups
 *   description: Database backup and point-in-time recovery management
 */

/**
 * @swagger
 * /api/backups:
 *   get:
 *     summary: List backup records
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [FULL, WAL]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED, FAILED, VERIFIED]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of backup records
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { type, status, limit } = req.query
    const backups = await backupService.listBackups({
      type: type as string | undefined,
      status: status as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    })
    res.json({ success: true, data: backups })
  })
)

/**
 * @swagger
 * /api/backups/latest:
 *   get:
 *     summary: Get the latest successful full backup
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Latest full backup record
 *       404:
 *         description: No completed full backup found
 */
router.get(
  '/latest',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    const backup = await backupService.getLatestFullBackup()
    if (!backup) {
      res.status(404).json({ success: false, error: 'No completed full backup found' })
      return
    }
    res.json({ success: true, data: backup })
  })
)

/**
 * @swagger
 * /api/backups/trigger:
 *   post:
 *     summary: Trigger a full base backup
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       202:
 *         description: Backup job started
 */
router.post(
  '/trigger',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await backupService.triggerFullBackup()
    res.status(202).json({ success: true, data: result })
  })
)

/**
 * @swagger
 * /api/backups/{id}/verify:
 *   post:
 *     summary: Verify a backup by re-computing its checksum
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verification result
 *       404:
 *         description: Backup not found
 */
router.post(
  '/:id/verify',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await backupService.verifyBackup(req.params.id)
    res.json({ success: true, data: result })
  })
)

/**
 * @swagger
 * /api/backups/purge:
 *   post:
 *     summary: Purge backup records older than the retention window
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               retentionDays:
 *                 type: integer
 *                 default: 30
 *     responses:
 *       200:
 *         description: Number of records deleted
 */
router.post(
  '/purge',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const retentionDays = req.body?.retentionDays ?? 30
    const result = await backupService.purgeOldBackups(retentionDays)
    res.json({ success: true, data: result })
  })
)

export const backupRouter = router
