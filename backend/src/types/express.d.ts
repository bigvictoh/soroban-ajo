export {}

declare global {
  namespace Express {
    interface RequestUser {
      id?: string
      publicKey?: string
      walletAddress?: string
      email?: string
      kycLevel?: number
      isAdmin?: boolean
      role?: string
      permissions?: string[]
    }

    interface Request {
      user?: RequestUser
    }
  }
}
