/**
 * Verification routes — Issue #589
 * Identity verification, phone/email OTP, document upload, trust score.
 */
import { Router, Response } from 'express'
import multer from 'multer'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { adminAuth } from '../middleware/adminAuth'
import * as vs from '../services/verificationService'
import { logger } from '../utils/logger'

export const verificationRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    cb(null, allowed.includes(file.mimetype))
  },
})

verificationRouter.use(authMiddleware)

/** GET /api/verification — current user's verification status */
verificationRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.walletAddress!
    const status = await vs.getVerificationStatus(userId)
    res.json({ success: true, data: status ?? { kycLevel: 0, kycStatus: 'none', trustScore: 0 } })
  } catch (err) {
    logger.error('getVerificationStatus error', err)
    res.status(500).json({ success: false, error: 'Failed to fetch verification status' })
  }
})

/** POST /api/verification/email/send — send email OTP */
verificationRouter.post('/email/send', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.walletAddress!
  const { email } = req.body
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'email is required' })
  }
  try {
    await vs.sendEmailOtp(userId, email)
    res.json({ success: true })
  } catch (err) {
    logger.error('sendEmailOtp error', err)
    res.status(500).json({ success: false, error: 'Failed to send email OTP' })
  }
})

/** POST /api/verification/email/verify — verify email OTP */
verificationRouter.post('/email/verify', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.walletAddress!
  const { otp } = req.body
  if (!otp) return res.status(400).json({ success: false, error: 'otp is required' })
  const ok = await vs.verifyEmailOtp(userId, String(otp))
  if (!ok) return res.status(400).json({ success: false, error: 'Invalid or expired OTP' })
  res.json({ success: true })
})

/** POST /api/verification/phone/send — send phone OTP */
verificationRouter.post('/phone/send', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.walletAddress!
  const { phone } = req.body
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ success: false, error: 'phone is required' })
  }
  try {
    await vs.sendPhoneOtp(userId, phone)
    res.json({ success: true })
  } catch (err) {
    logger.error('sendPhoneOtp error', err)
    res.status(500).json({ success: false, error: 'Failed to send phone OTP' })
  }
})

/** POST /api/verification/phone/verify — verify phone OTP */
verificationRouter.post('/phone/verify', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.walletAddress!
  const { otp } = req.body
  if (!otp) return res.status(400).json({ success: false, error: 'otp is required' })
  const ok = await vs.verifyPhoneOtp(userId, String(otp))
  if (!ok) return res.status(400).json({ success: false, error: 'Invalid or expired OTP' })
  res.json({ success: true })
})

/** POST /api/verification/documents — upload identity document */
verificationRouter.post('/documents', upload.single('file'), async (req: AuthRequest, res: Response) => {
  const userId = req.user!.walletAddress!
  const { docType } = req.body
  if (!req.file) return res.status(400).json({ success: false, error: 'file is required' })
  if (!docType) return res.status(400).json({ success: false, error: 'docType is required' })

  try {
    const doc = await vs.uploadDocument(userId, docType, req.file as any)
    res.json({ success: true, data: doc })
  } catch (err) {
    logger.error('uploadDocument error', err)
    res.status(500).json({ success: false, error: 'Failed to upload document' })
  }
})

/** GET /api/verification/trust-score — recalculate and return trust score */
verificationRouter.get('/trust-score', async (req: AuthRequest, res: Response) => {
  const userId = req.user!.walletAddress!
  const score = await vs.recalculateTrustScore(userId)
  res.json({ success: true, data: { trustScore: score } })
})

// ── Admin endpoints ────────────────────────────────────────────────────────

/** POST /api/verification/admin/kyc — set KYC level (admin only) */
verificationRouter.post('/admin/kyc', adminAuth('users:write'), async (req: AuthRequest, res: Response) => {
  const { userId, level, status, notes } = req.body
  if (!userId || typeof level !== 'number' || !status) {
    return res.status(400).json({ success: false, error: 'userId, level, and status are required' })
  }
  try {
    await vs.setKycLevel({ userId, level, status, notes })
    res.json({ success: true })
  } catch (err) {
    logger.error('setKycLevel error', err)
    res.status(500).json({ success: false, error: 'Failed to update KYC level' })
  }
})
