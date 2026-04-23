import { stellarPublicKeySchema } from './common.schema'
import { z } from 'zod'

export const generateTokenSchema = z.object({
  publicKey: stellarPublicKeySchema,
  pendingToken: z.string().min(1).optional(),
  totpCode: z.string().regex(/^\d{6}$/, 'TOTP code must be 6 digits').optional(),
  smsCode: z.string().regex(/^\d{6}$/, 'SMS code must be 6 digits').optional(),
  backupCode: z.string().regex(/^[A-F0-9]{5}-[A-F0-9]{5}$/i, 'Invalid backup code format').optional(),
  twoFactorMethod: z.enum(['totp', 'sms', 'backup']).optional(),
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

export const twoFactorVerificationSchema = z.object({
  totpCode: z.string().regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
})

export const smsSetupSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{7,14}$/, 'Phone number must be in E.164 format (e.g. +12345678900)'),
})

export const smsVerifySchema = z.object({
  smsCode: z.string().regex(/^\d{6}$/, 'SMS code must be 6 digits'),
})

export const backupCodeVerifySchema = z.object({
  backupCode: z.string().regex(/^[A-F0-9]{5}-[A-F0-9]{5}$/i, 'Invalid backup code format'),
})

export const recoverySchema = z.object({
  publicKey: stellarPublicKeySchema,
  backupCode: z.string().regex(/^[A-F0-9]{5}-[A-F0-9]{5}$/i, 'Invalid backup code format'),
})

export type GenerateTokenInput = z.infer<typeof generateTokenSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
export type TwoFactorVerificationInput = z.infer<typeof twoFactorVerificationSchema>
export type SmsSetupInput = z.infer<typeof smsSetupSchema>
export type SmsVerifyInput = z.infer<typeof smsVerifySchema>
export type BackupCodeVerifyInput = z.infer<typeof backupCodeVerifySchema>
