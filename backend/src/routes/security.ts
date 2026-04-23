import { Router, Response, Request } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { adminAuth } from '../middleware/adminAuth'
import { securityAuditService, SecurityEventType, SecuritySeverity } from '../services/securityAuditService'

export const securityRouter = Router()

/**
 * @swagger
 * tags:
 *   name: Security
 *   description: Security audit logs and intrusion detection
 */

// ─── Security Logs ────────────────────────────────────────────────────────────

/** GET /api/security/logs – query security logs (admin) */
securityRouter.get('/logs', adminAuth(), async (req: Request, res: Response) => {
  try {
    const result = await securityAuditService.getLogs({
      eventType: req.query.eventType as SecurityEventType | undefined,
      severity: req.query.severity as SecuritySeverity | undefined,
      userId: req.query.userId as string | undefined,
      ipAddress: req.query.ipAddress as string | undefined,
      outcome: req.query.outcome as string | undefined,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
    })
    res.json({ success: true, ...result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/** GET /api/security/logs/my – authenticated user's own security events */
securityRouter.get('/logs/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.walletAddress
    const result = await securityAuditService.getLogs({
      userId,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    })
    res.json({ success: true, ...result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Log Analysis ─────────────────────────────────────────────────────────────

/** GET /api/security/analysis – security trend analysis (admin) */
securityRouter.get('/analysis', adminAuth(), async (req: Request, res: Response) => {
  try {
    const hours = Number(req.query.hours) || 24
    const analysis = await securityAuditService.analyzeSecurityTrends(hours)
    res.json({ success: true, analysis })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Intrusion Detection ──────────────────────────────────────────────────────

/** GET /api/security/intrusion-alerts – list intrusion alerts (admin) */
securityRouter.get('/intrusion-alerts', adminAuth(), async (req: Request, res: Response) => {
  try {
    const result = await securityAuditService.listIntrusionAlerts({
      status: req.query.status as string | undefined,
      severity: req.query.severity as SecuritySeverity | undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    })
    res.json({ success: true, ...result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/** PATCH /api/security/intrusion-alerts/:id – update alert status (admin) */
securityRouter.patch('/intrusion-alerts/:id', adminAuth(), async (req: Request, res: Response) => {
  try {
    const { status } = req.body
    if (!['INVESTIGATING', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ error: 'status must be INVESTIGATING or RESOLVED' })
    }
    const alert = await securityAuditService.updateIntrusionAlertStatus(req.params.id, status)
    res.json({ success: true, alert })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Manual Log Entry (internal/admin) ───────────────────────────────────────

/** POST /api/security/log – manually record a security event (admin) */
securityRouter.post('/log', adminAuth(), async (req: Request, res: Response) => {
  try {
    const { eventType, severity, userId, ipAddress, userAgent, resource, action, outcome, metadata } = req.body
    if (!eventType || !severity || !outcome) {
      return res.status(400).json({ error: 'eventType, severity, outcome required' })
    }
    const entry = await securityAuditService.log({
      eventType,
      severity,
      userId,
      ipAddress,
      userAgent,
      resource,
      action,
      outcome,
      metadata: metadata ?? {},
    })
    res.status(201).json({ success: true, entry })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
