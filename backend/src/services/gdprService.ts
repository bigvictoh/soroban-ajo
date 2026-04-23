import { PrismaClient } from '@prisma/client'
import { createModuleLogger } from '../utils/logger'

const logger = createModuleLogger('GDPRService')
const prisma = new PrismaClient()
const prismaAny = prisma as any

export type ConsentType = 'ANALYTICS' | 'MARKETING' | 'FUNCTIONAL' | 'NECESSARY'
export type ConsentStatus = 'GRANTED' | 'DENIED' | 'WITHDRAWN'

export interface ConsentRecord {
  id: string
  userId: string
  consentType: ConsentType
  status: ConsentStatus
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  updatedAt: Date
}

export interface DeletionRequest {
  id: string
  userId: string
  reason?: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED'
  requestedAt: Date
  completedAt?: Date
  rejectionReason?: string
}

export class GDPRService {
  // ─── Consent Management ───────────────────────────────────────────────────

  async recordConsent(
    userId: string,
    consentType: ConsentType,
    status: ConsentStatus,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<ConsentRecord> {
    const record = await prismaAny.consentRecord.upsert({
      where: { userId_consentType: { userId, consentType } },
      create: { userId, consentType, status, ...meta },
      update: { status, updatedAt: new Date(), ...meta },
    })
    logger.info('Consent recorded', { userId, consentType, status })
    return record
  }

  async getConsents(userId: string): Promise<ConsentRecord[]> {
    return prismaAny.consentRecord.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } })
  }

  async withdrawAllConsents(userId: string): Promise<void> {
    await prismaAny.consentRecord.updateMany({
      where: { userId, status: 'GRANTED' },
      data: { status: 'WITHDRAWN', updatedAt: new Date() },
    })
    logger.info('All consents withdrawn', { userId })
  }

  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const record = await prismaAny.consentRecord.findUnique({
      where: { userId_consentType: { userId, consentType } },
    })
    return record?.status === 'GRANTED'
  }

  // ─── Data Export (GDPR Article 20 – Data Portability) ────────────────────

  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const [user, groups, contributions, consents, gamification, goals] = await Promise.all([
      prisma.user.findUnique({
        where: { walletAddress: userId },
        select: { walletAddress: true, createdAt: true, updatedAt: true, twoFactorEnabled: true },
      }),
      prisma.groupMember.findMany({
        where: { userId },
        include: { group: { select: { id: true, name: true, createdAt: true } } },
      }),
      prisma.contribution.findMany({
        where: { userId },
        select: { id: true, amount: true, round: true, txHash: true, createdAt: true },
      }),
      prismaAny.consentRecord.findMany({ where: { userId } }),
      prisma.userGamification.findFirst({ where: { userId } }),
      prisma.goal.findMany({ where: { userId }, select: { id: true, title: true, targetAmount: true, status: true, createdAt: true } }),
    ])

    return {
      exportedAt: new Date().toISOString(),
      user,
      groups: groups.map((g: any) => ({ ...g, group: { ...g.group } })),
      contributions: contributions.map((c: any) => ({ ...c, amount: c.amount.toString() })),
      consents,
      gamification: gamification
        ? { ...gamification, userId: undefined }
        : null,
      goals,
    }
  }

  // ─── Right to Deletion (GDPR Article 17) ─────────────────────────────────

  async requestDeletion(userId: string, reason?: string): Promise<DeletionRequest> {
    // Check for existing pending request
    const existing = await prismaAny.deletionRequest.findFirst({
      where: { userId, status: { in: ['PENDING', 'PROCESSING'] } },
    })
    if (existing) return existing

    const request = await prismaAny.deletionRequest.create({
      data: { userId, reason, status: 'PENDING' },
    })
    logger.info('Deletion request created', { userId, requestId: request.id })
    return request
  }

  async processDeletion(requestId: string): Promise<void> {
    const request = await prismaAny.deletionRequest.findUnique({ where: { id: requestId } })
    if (!request || request.status !== 'PENDING') {
      throw new Error('Deletion request not found or already processed')
    }

    await prismaAny.deletionRequest.update({
      where: { id: requestId },
      data: { status: 'PROCESSING' },
    })

    try {
      const userId = request.userId

      // Anonymize rather than hard-delete to preserve referential integrity
      await prisma.$transaction([
        // Remove personal identifiers from gamification
        prisma.userGamification.deleteMany({ where: { userId } }),
        // Remove activity feed
        prisma.activityFeed.deleteMany({ where: { userId } }),
        // Withdraw all consents
        prismaAny.consentRecord.updateMany({
          where: { userId },
          data: { status: 'WITHDRAWN' },
        }),
        // Anonymize user record (keep wallet for blockchain integrity)
        prisma.user.update({
          where: { walletAddress: userId },
          data: { twoFactorSecret: null, twoFactorEnabled: false },
        }),
      ])

      await prismaAny.deletionRequest.update({
        where: { id: requestId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })

      logger.info('User data deletion completed', { userId, requestId })
    } catch (err) {
      await prismaAny.deletionRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', rejectionReason: String(err) },
      })
      throw err
    }
  }

  async getDeletionRequest(requestId: string, userId: string): Promise<DeletionRequest | null> {
    return prismaAny.deletionRequest.findFirst({ where: { id: requestId, userId } })
  }

  async listDeletionRequests(params: { status?: string; page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params
    const where: Record<string, unknown> = {}
    if (params.status) where.status = params.status

    const [requests, total] = await Promise.all([
      prismaAny.deletionRequest.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prismaAny.deletionRequest.count({ where }),
    ])
    return { requests, total, page, pages: Math.ceil(total / limit) }
  }

  // ─── Privacy Policy ───────────────────────────────────────────────────────

  getPrivacyPolicy(): Record<string, unknown> {
    return {
      version: '1.0.0',
      effectiveDate: '2026-01-01',
      dataController: 'Ajo Platform',
      contactEmail: 'privacy@ajo.finance',
      rights: [
        { right: 'Access', article: 'GDPR Art. 15', description: 'Request a copy of your personal data' },
        { right: 'Rectification', article: 'GDPR Art. 16', description: 'Correct inaccurate personal data' },
        { right: 'Erasure', article: 'GDPR Art. 17', description: 'Request deletion of your personal data' },
        { right: 'Portability', article: 'GDPR Art. 20', description: 'Receive your data in a machine-readable format' },
        { right: 'Restriction', article: 'GDPR Art. 18', description: 'Restrict processing of your data' },
        { right: 'Objection', article: 'GDPR Art. 21', description: 'Object to processing of your data' },
      ],
      dataCategories: [
        { category: 'Identity', data: ['Wallet address'], purpose: 'Account identification', retention: 'Account lifetime' },
        { category: 'Financial', data: ['Contribution amounts', 'Transaction hashes'], purpose: 'Group savings management', retention: '7 years (legal requirement)' },
        { category: 'Technical', data: ['IP address', 'User agent'], purpose: 'Security and fraud prevention', retention: '90 days' },
        { category: 'Behavioral', data: ['Activity feed', 'Gamification data'], purpose: 'Platform improvement', retention: 'Account lifetime' },
      ],
      consentTypes: [
        { type: 'NECESSARY', description: 'Required for platform operation', canWithdraw: false },
        { type: 'FUNCTIONAL', description: 'Enhanced features like notifications', canWithdraw: true },
        { type: 'ANALYTICS', description: 'Usage analytics to improve the platform', canWithdraw: true },
        { type: 'MARKETING', description: 'Promotional communications', canWithdraw: true },
      ],
    }
  }
}

export const gdprService = new GDPRService()
