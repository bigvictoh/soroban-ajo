import { createHash, randomInt } from 'crypto'
import { prisma } from '../config/database'

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
const OTP_DIGITS = 6

function generateOtp(): string {
  return randomInt(0, 10 ** OTP_DIGITS).toString().padStart(OTP_DIGITS, '0')
}

function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex')
}

async function sendViaTwilio(to: string, body: string): Promise<void> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    throw new Error('Twilio env vars not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)')
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  const params = new URLSearchParams({ To: to, From: TWILIO_FROM_NUMBER, Body: body })
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Twilio error ${res.status}: ${(err as any).message ?? res.statusText}`)
  }
}

export const smsService = {
  /**
   * Generate a 6-digit OTP, store its hash in the DB, and send it via SMS.
   * Returns the OTP only in test/dev mode (for integration tests).
   */
  async sendOtp(walletAddress: string): Promise<string | undefined> {
    const user = await prisma.user.findUnique({ where: { walletAddress } })
    if (!user?.phoneNumber) throw new Error('No phone number registered for this account')

    const otp = generateOtp()
    const expiresAt = new Date(Date.now() + OTP_TTL_MS)

    await prisma.user.update({
      where: { walletAddress },
      data: { smsOtpHash: hashOtp(otp), smsOtpExpiresAt: expiresAt },
    })

    await sendViaTwilio(user.phoneNumber, `Your Ajo verification code is: ${otp}. Valid for 10 minutes.`)

    // Expose OTP in non-production for testing
    return process.env.NODE_ENV !== 'production' ? otp : undefined
  },

  /**
   * Verify a submitted OTP against the stored hash.
   * Clears the OTP on success to prevent reuse.
   */
  async verifyOtp(walletAddress: string, otp: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { walletAddress } })
    if (!user?.smsOtpHash || !user.smsOtpExpiresAt) return false
    if (new Date() > user.smsOtpExpiresAt) return false
    if (hashOtp(otp) !== user.smsOtpHash) return false

    // Consume the OTP
    await prisma.user.update({
      where: { walletAddress },
      data: { smsOtpHash: null, smsOtpExpiresAt: null },
    })
    return true
  },
}
