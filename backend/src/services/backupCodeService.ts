import { createHash, randomBytes } from 'crypto'
import { prisma } from '../config/database'

const CODE_COUNT = 10
const CODE_BYTES = 5 // 10 hex chars per code → "XXXXX-XXXXX" display format

function generateCode(): string {
  const hex = randomBytes(CODE_BYTES).toString('hex').toUpperCase()
  return `${hex.slice(0, 5)}-${hex.slice(5)}`
}

function hashCode(code: string): string {
  return createHash('sha256').update(code.replace('-', '').toUpperCase()).digest('hex')
}

export const backupCodeService = {
  /**
   * Generate 10 fresh backup codes, store their hashes, and return the plaintext codes.
   * Replaces any previously stored codes.
   */
  async generate(walletAddress: string): Promise<string[]> {
    const codes = Array.from({ length: CODE_COUNT }, generateCode)
    const hashes = codes.map(hashCode)
    await prisma.user.update({
      where: { walletAddress },
      data: { backupCodes: JSON.stringify(hashes) },
    })
    return codes
  },

  /**
   * Verify a backup code and consume it (one-time use).
   * Returns true if valid, false otherwise.
   */
  async verify(walletAddress: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { walletAddress } })
    if (!user?.backupCodes) return false

    const hashes: string[] = JSON.parse(user.backupCodes)
    const incoming = hashCode(code)
    const idx = hashes.indexOf(incoming)
    if (idx === -1) return false

    // Consume the code
    hashes.splice(idx, 1)
    await prisma.user.update({
      where: { walletAddress },
      data: { backupCodes: JSON.stringify(hashes) },
    })
    return true
  },

  /** Returns the number of remaining backup codes without revealing them. */
  async remaining(walletAddress: string): Promise<number> {
    const user = await prisma.user.findUnique({ where: { walletAddress } })
    if (!user?.backupCodes) return 0
    return (JSON.parse(user.backupCodes) as string[]).length
  },
}
