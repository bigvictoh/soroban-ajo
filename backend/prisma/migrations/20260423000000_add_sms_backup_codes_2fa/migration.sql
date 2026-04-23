-- AlterTable: add SMS 2FA, backup codes, and 2FA method fields to User
ALTER TABLE "User"
  ADD COLUMN "twoFactorMethod" TEXT,
  ADD COLUMN "phoneNumber" TEXT,
  ADD COLUMN "smsOtpHash" TEXT,
  ADD COLUMN "smsOtpExpiresAt" TIMESTAMP(3),
  ADD COLUMN "backupCodes" TEXT;
