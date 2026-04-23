import { AuthRequest, authenticate } from '../middleware/auth'
import { Request, Response, Router } from 'express'
import {
  generateTokenSchema,
  twoFactorVerificationSchema,
  smsSetupSchema,
  smsVerifySchema,
  recoverySchema,
} from '../schemas/auth.schema'
import { AuthService } from '../services/authService'
import { backupCodeService } from '../services/backupCodeService'
import { smsService } from '../services/smsService'
import { prisma } from '../config/database'
import { totpService } from '../services/totpService'
import { validateRequest } from '../middleware/validateRequest'

const router = Router()

// ---------------------------------------------------------------------------
// POST /api/auth/token
// Supports: no 2FA, TOTP, SMS, and backup-code second factors
// ---------------------------------------------------------------------------
router.post(
  '/token',
  validateRequest({ body: generateTokenSchema }),
  async (req: Request, res: Response): Promise<void> => {
    const { publicKey, pendingToken, totpCode, smsCode, backupCode, twoFactorMethod } = req.body

    const user = await prisma.user.upsert({
      where: { walletAddress: publicKey },
      update: { updatedAt: new Date() },
      create: { walletAddress: publicKey },
    })

    if (!user.twoFactorEnabled) {
      res.json({ token: AuthService.generateToken(publicKey), twoFactorEnabled: false })
      return
    }

    // --- Step 1: no code provided yet → issue challenge ---
    if (!totpCode && !smsCode && !backupCode) {
      const challenge = AuthService.generateTwoFactorChallenge(publicKey)

      // If SMS method, send OTP automatically
      if (user.twoFactorMethod === 'sms') {
        try {
          const devOtp = await smsService.sendOtp(publicKey)
          res.status(202).json({
            requiresTwoFactor: true,
            twoFactorMethod: 'sms',
            pendingToken: challenge,
            ...(devOtp ? { devOtp } : {}),
          })
        } catch (err) {
          res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to send SMS OTP' })
        }
        return
      }

      res.status(202).json({
        requiresTwoFactor: true,
        twoFactorMethod: user.twoFactorMethod ?? 'totp',
        pendingToken: challenge,
      })
      return
    }

    // --- Step 2: verify challenge token ---
    if (!pendingToken) {
      res.status(401).json({ error: 'Pending two-factor challenge is required' })
      return
    }
    try {
      AuthService.verifyTwoFactorChallenge(pendingToken, publicKey)
    } catch {
      res.status(401).json({ error: 'Invalid or expired two-factor challenge' })
      return
    }

    // --- Step 3: verify the chosen factor ---
    const method = twoFactorMethod ?? user.twoFactorMethod ?? 'totp'

    if (method === 'totp') {
      if (!totpCode || !user.twoFactorSecret || !totpService.verifyToken(user.twoFactorSecret, totpCode)) {
        res.status(401).json({ error: 'Invalid TOTP code' })
        return
      }
    } else if (method === 'sms') {
      if (!smsCode || !(await smsService.verifyOtp(publicKey, smsCode))) {
        res.status(401).json({ error: 'Invalid or expired SMS code' })
        return
      }
    } else if (method === 'backup') {
      if (!backupCode || !(await backupCodeService.verify(publicKey, backupCode))) {
        res.status(401).json({ error: 'Invalid or already-used backup code' })
        return
      }
    } else {
      res.status(400).json({ error: 'Unknown two-factor method' })
      return
    }

    res.json({ token: AuthService.generateToken(publicKey, { twoFactorVerified: true }), twoFactorEnabled: true })
  },
)

// ---------------------------------------------------------------------------
// GET /api/auth/2fa/status
// ---------------------------------------------------------------------------
router.get('/2fa/status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const walletAddress = req.user?.walletAddress
  if (!walletAddress) { res.status(401).json({ error: 'Authentication required' }); return }

  const user = await prisma.user.findUnique({ where: { walletAddress } })
  res.json({
    enabled: user?.twoFactorEnabled ?? false,
    method: user?.twoFactorMethod ?? null,
    enabledAt: user?.twoFactorEnabledAt ?? null,
    hasPhone: !!user?.phoneNumber,
    backupCodesRemaining: user?.backupCodes
      ? (JSON.parse(user.backupCodes) as string[]).length
      : 0,
  })
})

// ---------------------------------------------------------------------------
// TOTP setup / enable / disable (existing, unchanged)
// ---------------------------------------------------------------------------
router.post('/2fa/setup', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const walletAddress = req.user?.walletAddress
  if (!walletAddress) { res.status(401).json({ error: 'Authentication required' }); return }

  const existing = await prisma.user.findUnique({ where: { walletAddress } })
  if (existing?.twoFactorEnabled) {
    res.status(400).json({ error: 'Two-factor authentication is already enabled' }); return
  }

  const secret = totpService.generateSecret()
  await prisma.user.upsert({
    where: { walletAddress },
    update: { twoFactorSecret: secret, twoFactorEnabled: false, twoFactorEnabledAt: null },
    create: { walletAddress, twoFactorSecret: secret, twoFactorEnabled: false },
  })

  res.json({ secret, otpAuthUrl: totpService.buildOtpAuthUrl(secret, walletAddress) })
})

router.post(
  '/2fa/enable',
  authenticate,
  validateRequest({ body: twoFactorVerificationSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const walletAddress = req.user?.walletAddress
    if (!walletAddress) { res.status(401).json({ error: 'Authentication required' }); return }

    const user = await prisma.user.findUnique({ where: { walletAddress } })
    if (!user?.twoFactorSecret) {
      res.status(400).json({ error: 'Two-factor setup has not been initialized' }); return
    }
    if (!totpService.verifyToken(user.twoFactorSecret, req.body.totpCode)) {
      res.status(401).json({ error: 'Invalid TOTP code' }); return
    }

    const codes = await backupCodeService.generate(walletAddress)
    await prisma.user.update({
      where: { walletAddress },
      data: { twoFactorEnabled: true, twoFactorEnabledAt: new Date(), twoFactorMethod: 'totp' },
    })

    res.json({ success: true, enabled: true, backupCodes: codes })
  },
)

router.post(
  '/2fa/disable',
  authenticate,
  validateRequest({ body: twoFactorVerificationSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const walletAddress = req.user?.walletAddress
    if (!walletAddress) { res.status(401).json({ error: 'Authentication required' }); return }

    const user = await prisma.user.findUnique({ where: { walletAddress } })
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      res.status(400).json({ error: 'Two-factor authentication is not enabled' }); return
    }
    if (!totpService.verifyToken(user.twoFactorSecret, req.body.totpCode)) {
      res.status(401).json({ error: 'Invalid TOTP code' }); return
    }

    await prisma.user.update({
      where: { walletAddress },
      data: {
        twoFactorEnabled: false, twoFactorSecret: null, twoFactorEnabledAt: null,
        twoFactorMethod: null, phoneNumber: null, smsOtpHash: null, smsOtpExpiresAt: null,
        backupCodes: null,
      },
    })
    res.json({ success: true, enabled: false })
  },
)

// ---------------------------------------------------------------------------
// SMS 2FA: setup phone, send OTP, verify + enable
// ---------------------------------------------------------------------------

// POST /api/auth/2fa/sms/setup  — register phone number
router.post(
  '/2fa/sms/setup',
  authenticate,
  validateRequest({ body: smsSetupSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const walletAddress = req.user?.walletAddress
    if (!walletAddress) { res.status(401).json({ error: 'Authentication required' }); return }

    await prisma.user.update({
      where: { walletAddress },
      data: { phoneNumber: req.body.phoneNumber },
    })

    // Send verification OTP
    try {
      const devOtp = await smsService.sendOtp(walletAddress)
      res.json({ success: true, ...(devOtp ? { devOtp } : {}) })
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to send SMS' })
    }
  },
)

// POST /api/auth/2fa/sms/verify  — verify OTP and enable SMS 2FA
router.post(
  '/2fa/sms/verify',
  authenticate,
  validateRequest({ body: smsVerifySchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const walletAddress = req.user?.walletAddress
    if (!walletAddress) { res.status(401).json({ error: 'Authentication required' }); return }

    const valid = await smsService.verifyOtp(walletAddress, req.body.smsCode)
    if (!valid) { res.status(401).json({ error: 'Invalid or expired SMS code' }); return }

    const codes = await backupCodeService.generate(walletAddress)
    await prisma.user.update({
      where: { walletAddress },
      data: { twoFactorEnabled: true, twoFactorEnabledAt: new Date(), twoFactorMethod: 'sms' },
    })

    res.json({ success: true, enabled: true, backupCodes: codes })
  },
)

// POST /api/auth/2fa/sms/send  — resend OTP (for already-enabled SMS 2FA)
router.post('/2fa/sms/send', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const walletAddress = req.user?.walletAddress
  if (!walletAddress) { res.status(401).json({ error: 'Authentication required' }); return }

  try {
    const devOtp = await smsService.sendOtp(walletAddress)
    res.json({ success: true, ...(devOtp ? { devOtp } : {}) })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to send SMS' })
  }
})

// ---------------------------------------------------------------------------
// Backup codes
// ---------------------------------------------------------------------------

// POST /api/auth/2fa/backup-codes/regenerate
router.post('/2fa/backup-codes/regenerate', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const walletAddress = req.user?.walletAddress
  if (!walletAddress) { res.status(401).json({ error: 'Authentication required' }); return }

  const user = await prisma.user.findUnique({ where: { walletAddress } })
  if (!user?.twoFactorEnabled) {
    res.status(400).json({ error: '2FA must be enabled before generating backup codes' }); return
  }

  const codes = await backupCodeService.generate(walletAddress)
  res.json({ backupCodes: codes, remaining: codes.length })
})

// GET /api/auth/2fa/backup-codes/count
router.get('/2fa/backup-codes/count', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const walletAddress = req.user?.walletAddress
  if (!walletAddress) { res.status(401).json({ error: 'Authentication required' }); return }

  const remaining = await backupCodeService.remaining(walletAddress)
  res.json({ remaining })
})

// ---------------------------------------------------------------------------
// Recovery: use a backup code to disable 2FA entirely
// POST /api/auth/2fa/recover
// ---------------------------------------------------------------------------
router.post(
  '/2fa/recover',
  validateRequest({ body: recoverySchema }),
  async (req: Request, res: Response): Promise<void> => {
    const { backupCode, publicKey } = req.body as { backupCode: string; publicKey: string }

    const valid = await backupCodeService.verify(publicKey, backupCode)
    if (!valid) { res.status(401).json({ error: 'Invalid or already-used backup code' }); return }

    // Issue a recovery token — caller must re-enable 2FA after recovery
    await prisma.user.update({
      where: { walletAddress: publicKey },
      data: {
        twoFactorEnabled: false, twoFactorSecret: null, twoFactorEnabledAt: null,
        twoFactorMethod: null, phoneNumber: null, smsOtpHash: null, smsOtpExpiresAt: null,
        backupCodes: null,
      },
    })

    res.json({
      success: true,
      token: AuthService.generateToken(publicKey),
      message: '2FA has been disabled. Please re-enable it after signing in.',
    })
  },
)

export const authRouter = router
