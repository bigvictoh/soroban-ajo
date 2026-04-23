import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { adminAuth } from '../middleware/adminAuth'
import { gdprService, ConsentType, ConsentStatus } from '../services/gdprService'

export const gdprRouter = Router()

/**
 * @swagger
 * tags:
 *   name: GDPR
 *   description: GDPR compliance – consent, data export, and deletion
 */

// ─── Privacy Policy ───────────────────────────────────────────────────────────

/** GET /api/gdpr/privacy-policy */
gdprRouter.get('/privacy-policy', (_req, res) => {
  res.json({ success: true, policy: gdprService.getPrivacyPolicy() })
})

// ─── Consent Management ───────────────────────────────────────────────────────

/** GET /api/gdpr/consents – get current user's consents */
gdprRouter.get('/consents', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.walletAddress
    const consents = await gdprService.getConsents(userId)
    res.json({ success: true, consents })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /api/gdpr/consents – record a consent decision */
gdprRouter.post('/consents', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.walletAddress
    const { consentType, status } = req.body

    const validTypes: ConsentType[] = ['ANALYTICS', 'MARKETING', 'FUNCTIONAL', 'NECESSARY']
    const validStatuses: ConsentStatus[] = ['GRANTED', 'DENIED', 'WITHDRAWN']

    if (!validTypes.includes(consentType)) {
      return res.status(400).json({ error: `consentType must be one of: ${validTypes.join(', ')}` })
    }
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` })
    }

    const record = await gdprService.recordConsent(userId, consentType, status, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })
    res.status(201).json({ success: true, consent: record })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/** DELETE /api/gdpr/consents – withdraw all consents */
gdprRouter.delete('/consents', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await gdprService.withdrawAllConsents(req.user!.walletAddress)
    res.json({ success: true, message: 'All consents withdrawn' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Data Export ──────────────────────────────────────────────────────────────

/** GET /api/gdpr/export – export all personal data (GDPR Art. 20) */
gdprRouter.get('/export', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.walletAddress
    const data = await gdprService.exportUserData(userId)
    res.setHeader('Content-Disposition', `attachment; filename="gdpr-export-${Date.now()}.json"`)
    res.setHeader('Content-Type', 'application/json')
    res.json(data)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Right to Deletion ────────────────────────────────────────────────────────

/** POST /api/gdpr/deletion-request – request account deletion (GDPR Art. 17) */
gdprRouter.post('/deletion-request', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.walletAddress
    const request = await gdprService.requestDeletion(userId, req.body.reason)
    res.status(202).json({ success: true, request })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/** GET /api/gdpr/deletion-request/:id – check deletion request status */
gdprRouter.get('/deletion-request/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const request = await gdprService.getDeletionRequest(req.params.id, req.user!.walletAddress)
    if (!request) return res.status(404).json({ error: 'Not found' })
    res.json({ success: true, request })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Admin ────────────────────────────────────────────────────────────────────

/** GET /api/gdpr/admin/deletion-requests – list all deletion requests */
gdprRouter.get('/admin/deletion-requests', adminAuth(), async (req, res: Response) => {
  try {
    const result = await gdprService.listDeletionRequests({
      status: req.query.status as string | undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    })
    res.json({ success: true, ...result })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /api/gdpr/admin/deletion-requests/:id/process – process a deletion request */
gdprRouter.post('/admin/deletion-requests/:id/process', adminAuth(), async (req, res: Response) => {
  try {
    await gdprService.processDeletion(req.params.id)
    res.json({ success: true, message: 'Deletion processed' })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
