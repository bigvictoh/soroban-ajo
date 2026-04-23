import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { asyncHandler } from '../middleware/errorHandler'
import { searchAuditLogs, purgeAuditLogs, generateComplianceReport } from '../services/auditService'

const router = Router()

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Audit log search and compliance reporting
 */

/**
 * @swagger
 * /api/audit:
 *   get:
 *     summary: Search audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: actorId
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: targetType
 *         schema: { type: string }
 *       - in: query
 *         name: targetId
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Paginated audit log results
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { actorId, action, targetType, targetId, startDate, endDate, page, limit } = req.query as Record<string, string>
    const result = await searchAuditLogs({
      actorId,
      action,
      targetType,
      targetId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
    res.json({ success: true, data: result })
  })
)

/**
 * @swagger
 * /api/audit/report:
 *   get:
 *     summary: Generate a compliance report for a date range
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Compliance report
 *       400:
 *         description: startDate and endDate are required
 */
router.get(
  '/report',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query as Record<string, string>
    if (!startDate || !endDate) {
      res.status(400).json({ success: false, error: 'startDate and endDate are required' })
      return
    }
    const report = await generateComplianceReport(new Date(startDate), new Date(endDate))
    res.json({ success: true, data: report })
  })
)

/**
 * @swagger
 * /api/audit/purge:
 *   post:
 *     summary: Purge audit logs older than the retention window
 *     tags: [Audit]
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
 *                 default: 90
 *     responses:
 *       200:
 *         description: Number of records deleted
 */
router.post(
  '/purge',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const retentionDays = req.body?.retentionDays ?? 90
    const result = await purgeAuditLogs(retentionDays)
    res.json({ success: true, data: result })
  })
)

export const auditRouter = router
