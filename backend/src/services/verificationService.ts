/**
 * VerificationService — Issue #589
 * Handles identity verification, phone/email OTP, document storage, and trust score.
 */
import crypto from 'crypto'
import path from 'path'
import fs from 'fs/promises'
import { prisma } from '../config/database'
import { emailService } from './emailService'
import { createModuleLogger } from '../utils/logger'

const logger = createModuleLogger('VerificationService')

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
const DOC_UPLOAD_DIR = process.env.DOC_UPLOAD_DIR || '/tmp/ajo-docs'

// ── Trust score weights ────────────────────────────────────────────────────
const TRUST_WEIGHTS = {
  emailVerified: 20,
  phoneVerified: 25,
  kycLevel1: 10, // email only
  kycLevel2: 20, // phone + email
  kycLevel3: 25, // identity docs approved
  contributionStreak: 0, // computed dynamically (up to 30)
}

function generateOtp(): string {
  return String(Math.floor(100000 + crypto.randomInt(900000)))
}

async function getOrCreateVerification(userId: string) {
  return prisma.verification.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })
}

// ── Email verification ─────────────────────────────────────────────────────

export async function sendEmailOtp(userId: string, email: string): Promise<void> {
  const otp = generateOtp()
  const expiry = new Date(Date.now() + OTP_TTL_MS)

  await getOrCreateVerification(userId)
  await prisma.verification.update({
    where: { userId },
    data: { emailOtp: otp, emailOtpExpiry: expiry },
  })

  // Update user email
  await prisma.user.update({ where: { walletAddress: userId }, data: { email } })

  const html = `<p>Your Ajo email verification code is: <strong>${otp}</strong>. It expires in 10 minutes.</p>`
  await emailService.sendEmail({ to: email, subject: 'Verify your email — Ajo', html })
  logger.info('Email OTP sent', { userId })
}

export async function verifyEmailOtp(userId: string, otp: string): Promise<boolean> {
  const v = await prisma.verification.findUnique({ where: { userId } })
  if (!v || v.emailOtp !== otp || !v.emailOtpExpiry || v.emailOtpExpiry < new Date()) {
    return false
  }

  await prisma.verification.update({
    where: { userId },
    data: { emailVerified: true, emailOtp: null, emailOtpExpiry: null },
  })

  await recalculateTrustScore(userId)
  logger.info('Email verified', { userId })
  return true
}

// ── Phone verification ─────────────────────────────────────────────────────

export async function sendPhoneOtp(userId: string, phone: string): Promise<void> {
  const otp = generateOtp()
  const expiry = new Date(Date.now() + OTP_TTL_MS)

  await getOrCreateVerification(userId)
  await prisma.verification.update({
    where: { userId },
    data: { phone, phoneOtp: otp, phoneOtpExpiry: expiry },
  })

  // In production, integrate an SMS provider (Twilio, AWS SNS, etc.)
  // For now, log the OTP (dev mode) or send via configured provider
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[DEV] Phone OTP for ${phone}: ${otp}`)
  } else {
    await sendSmsOtp(phone, otp)
  }
}

export async function verifyPhoneOtp(userId: string, otp: string): Promise<boolean> {
  const v = await prisma.verification.findUnique({ where: { userId } })
  if (!v || v.phoneOtp !== otp || !v.phoneOtpExpiry || v.phoneOtpExpiry < new Date()) {
    return false
  }

  await prisma.verification.update({
    where: { userId },
    data: { phoneVerified: true, phoneOtp: null, phoneOtpExpiry: null },
  })

  await recalculateTrustScore(userId)
  logger.info('Phone verified', { userId })
  return true
}

async function sendSmsOtp(phone: string, otp: string): Promise<void> {
  // Stub — wire up Twilio or AWS SNS here
  logger.warn('SMS provider not configured — OTP not sent', { phone })
}

// ── Document upload ────────────────────────────────────────────────────────

export async function uploadDocument(
  userId: string,
  docType: string,
  file: { originalname: string; mimetype: string; size: number; buffer: Buffer }
): Promise<{ id: string; docType: string; status: string }> {
  await getOrCreateVerification(userId)
  const v = await prisma.verification.findUnique({ where: { userId } })
  if (!v) throw new Error('Verification record not found')

  // Persist file to local storage (swap for S3 in production)
  await fs.mkdir(DOC_UPLOAD_DIR, { recursive: true })
  const ext = path.extname(file.originalname)
  const storageKey = `${userId}-${docType}-${Date.now()}${ext}`
  await fs.writeFile(path.join(DOC_UPLOAD_DIR, storageKey), file.buffer)

  const doc = await prisma.verificationDoc.create({
    data: {
      verificationId: v.id,
      docType,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageKey,
      status: 'pending',
    },
  })

  // Auto-advance KYC to pending when docs are uploaded
  if (v.kycStatus === 'none') {
    await prisma.verification.update({
      where: { userId },
      data: { kycStatus: 'pending', kycRequestedAt: new Date() },
    })
  }

  logger.info('Document uploaded', { userId, docType, docId: doc.id })
  return { id: doc.id, docType: doc.docType, status: doc.status }
}

// ── Admin: approve / reject KYC ───────────────────────────────────────────

export async function setKycLevel(params: {
  userId: string
  level: number
  status: 'approved' | 'rejected' | 'none'
  notes?: string
}): Promise<void> {
  const data: Record<string, unknown> = {
    kycLevel: params.level,
    kycStatus: params.status,
    kycNotes: params.notes ?? null,
  }
  if (params.status === 'approved') data.kycVerifiedAt = new Date()
  if (params.status === 'rejected') data.kycRejectedAt = new Date()

  await getOrCreateVerification(params.userId)
  await prisma.verification.update({ where: { userId: params.userId }, data })
  await recalculateTrustScore(params.userId)
  logger.info('KYC level set', params)
}

// ── Trust score ────────────────────────────────────────────────────────────

export async function recalculateTrustScore(userId: string): Promise<number> {
  const v = await prisma.verification.findUnique({ where: { userId } })
  if (!v) return 0

  let score = 0
  if (v.emailVerified) score += TRUST_WEIGHTS.emailVerified
  if (v.phoneVerified) score += TRUST_WEIGHTS.phoneVerified
  if (v.kycLevel >= 1) score += TRUST_WEIGHTS.kycLevel1
  if (v.kycLevel >= 2) score += TRUST_WEIGHTS.kycLevel2
  if (v.kycLevel >= 3) score += TRUST_WEIGHTS.kycLevel3

  // Contribution streak bonus (up to 30 points)
  const contributions = await prisma.contribution.count({ where: { walletAddress: userId } })
  score += Math.min(contributions * 2, 30)

  score = Math.min(score, 100)

  await prisma.verification.update({
    where: { userId },
    data: { trustScore: score, trustUpdatedAt: new Date() },
  })

  return score
}

// ── Read ───────────────────────────────────────────────────────────────────

export async function getVerificationStatus(userId: string) {
  const v = await prisma.verification.findUnique({
    where: { userId },
    include: { documents: { select: { id: true, docType: true, fileName: true, status: true, createdAt: true } } },
  })
  if (!v) return null

  return {
    kycLevel: v.kycLevel,
    kycStatus: v.kycStatus,
    kycRequestedAt: v.kycRequestedAt,
    kycVerifiedAt: v.kycVerifiedAt,
    kycRejectedAt: v.kycRejectedAt,
    emailVerified: v.emailVerified,
    phoneVerified: v.phoneVerified,
    phone: v.phone ? `***${v.phone.slice(-4)}` : null,
    trustScore: v.trustScore,
    documents: v.documents,
  }
}
