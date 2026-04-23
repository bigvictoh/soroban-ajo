import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { adminAuth } from '../middleware/adminAuth'
import { mlFraudDetectionService, AlertStatus, FraudSeverity } from '../services/mlFraudDetectionService'

export const fraudRouter = Router()

/**
 * @swagger
 * tags:
 *   name: Fraud Detection
 *   description: ML-based fraud detection and alert management
 */

/**
 * POST /api/fraud/analyze
 * Analyze a transaction for fraud patterns (internal/admin use)
 */
fraudRouter.post('/analyze', adminAuth(), async (req, res: Response) => {
  try {
    const { userId, amount, groupId, ipAddress } = req.body
    if (!userId || !amount || !groupId) {
      return res.status(400).json({ error: 'userId, amount, groupId required' })
    }
    const result = await mlFraudDetectionService.analyzeTransaction({
      userId,
      amount: BigInt(amount),
      groupId,
      timestamp: new Date(),
      ipAddress,
    })
    res.json({ success: true, result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/fraud/anomalies
 * Run anomaly detection across all users
 */
fraudRouter.get('/anomalies', adminAuth(), async (req, res: Response) => {
  try {
    const lookbackDays = Number(req.query.days) || 30
    const anomalies = await mlFraudDetectionService.detectContributionAnomalies(lookbackDays)
    res.json({ success: true, anomalies })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/fraud/alerts
 * List fraud alerts (admin)
 */
fraudRouter.get('/alerts', adminAuth(), async (req, res: Response) => {
  try {
    const { status, severity, userId, page, limit } = req.query
    const result = await mlFraudDetectionService.listAlerts({
      status: status as AlertStatus | undefined,
      severity: severity as FraudSeverity | undefined,
      userId: userId as string | undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    })
    res.json({ success: true, ...result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/fraud/alerts/pending
 * Get alerts pending manual review
 */
fraudRouter.get('/alerts/pending', adminAuth(), async (req, res: Response) => {
  try {
    const alerts = await mlFraudDetectionService.getPendingReviews(Number(req.query.limit) || 50)
    res.json({ success: true, alerts })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/fraud/alerts/:id/review
 * Submit manual review decision on an alert
 */
fraudRouter.post('/alerts/:id/review', adminAuth(), async (req, res: Response) => {
  try {
    const { status, resolution } = req.body
    if (!['RESOLVED', 'DISMISSED'].includes(status)) {
      return res.status(400).json({ error: 'status must be RESOLVED or DISMISSED' })
    }
    if (!resolution) return res.status(400).json({ error: 'resolution required' })

    const adminId = (req as any).admin?.id || 'admin'
    const alert = await mlFraudDetectionService.reviewAlert(
      req.params.id,
      adminId,
      status,
      resolution
    )
    res.json({ success: true, alert })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/fraud/my-flags
 * Authenticated user can see their own fraud flags
 */
fraudRouter.get('/my-flags', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.walletAddress
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const result = await mlFraudDetectionService.listAlerts({ userId, limit: 10 })
    res.json({ success: true, flags: result.alerts })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
