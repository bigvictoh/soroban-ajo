/**
 * Member profile route — Issue #598
 * Returns comprehensive profile data for any member by wallet address.
 */
import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'

export const membersRouter = Router()

/** GET /api/members/:address — public member profile */
membersRouter.get('/:address', async (req: Request, res: Response) => {
  const { address } = req.params

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: address },
      include: {
        verification: {
          select: {
            kycLevel: true,
            kycStatus: true,
            emailVerified: true,
            phoneVerified: true,
            trustScore: true,
          },
        },
        gamification: {
          select: { level: true, points: true, streakDays: true },
        },
        metrics: {
          select: {
            totalContributed: true,
            totalReceived: true,
            groupsJoined: true,
            groupsCompleted: true,
            lastActiveAt: true,
          },
        },
        groups: {
          include: {
            group: {
              select: { id: true, name: true, isActive: true, contributionAmount: true },
            },
          },
          orderBy: { joinedAt: 'desc' },
          take: 20,
        },
        contributions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            amount: true,
            round: true,
            txHash: true,
            createdAt: true,
            group: { select: { id: true, name: true } },
          },
        },
        achievements: {
          include: { achievement: true },
          orderBy: { unlockedAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!user) {
      return res.status(404).json({ success: false, error: 'Member not found' })
    }

    // Compute on-time rate from contributions (all on-time for now; extend with penalty data)
    const totalContributions = user.contributions.length
    const metrics = user.metrics

    // Reputation badges
    const badges = computeBadges({
      trustScore: user.verification?.trustScore ?? 0,
      kycLevel: user.verification?.kycLevel ?? 0,
      groupsCompleted: metrics?.groupsCompleted ?? 0,
      totalContributions,
      streakDays: (user.gamification as any)?.streakDays ?? 0,
      points: (user.gamification as any)?.points ?? 0,
    })

    const profile = {
      walletAddress: user.walletAddress,
      name: user.name ?? null,
      joinedAt: user.createdAt,
      verification: user.verification ?? { kycLevel: 0, kycStatus: 'none', emailVerified: false, phoneVerified: false, trustScore: 0 },
      gamification: user.gamification ?? { level: 'BRONZE', points: 0, streakDays: 0 },
      stats: {
        totalContributions,
        totalContributed: user.metrics?.totalContributed?.toString() ?? '0',
        totalReceived: user.metrics?.totalReceived?.toString() ?? '0',
        groupsJoined: user.metrics?.groupsJoined ?? user.groups.length,
        groupsCompleted: user.metrics?.groupsCompleted ?? 0,
        activeGroups: user.groups.filter((g) => g.group.isActive).length,
        lastActiveAt: user.metrics?.lastActiveAt ?? user.updatedAt,
      },
      badges,
      groups: user.groups.map((gm) => ({
        id: gm.group.id,
        name: gm.group.name,
        isActive: gm.group.isActive,
        joinedAt: gm.joinedAt,
      })),
      recentContributions: user.contributions.map((c) => ({
        id: c.id,
        amount: c.amount.toString(),
        round: c.round,
        txHash: c.txHash,
        createdAt: c.createdAt,
        groupName: c.group.name,
        groupId: c.group.id,
      })),
      achievements: user.achievements.map((ua: any) => ({
        id: ua.achievement?.id ?? ua.achievementId,
        title: ua.achievement?.name ?? ua.achievementId,
        description: ua.achievement?.description ?? '',
        icon: ua.achievement?.icon ?? '🏆',
        unlockedAt: ua.unlockedAt,
      })),
    }

    res.json({ success: true, data: profile })
  } catch (err) {
    logger.error('getMemberProfile error', err)
    res.status(500).json({ success: false, error: 'Failed to fetch member profile' })
  }
})

// ── Reputation badge logic ─────────────────────────────────────────────────

interface BadgeInput {
  trustScore: number
  kycLevel: number
  groupsCompleted: number
  totalContributions: number
  streakDays: number
  points: number
}

interface Badge {
  id: string
  label: string
  icon: string
  color: string
}

function computeBadges(input: BadgeInput): Badge[] {
  const badges: Badge[] = []

  if (input.kycLevel >= 3) badges.push({ id: 'verified', label: 'Fully Verified', icon: '✅', color: 'green' })
  else if (input.kycLevel >= 1) badges.push({ id: 'partial_kyc', label: 'Partially Verified', icon: '🔍', color: 'yellow' })

  if (input.trustScore >= 80) badges.push({ id: 'trusted', label: 'Trusted Member', icon: '🛡️', color: 'blue' })

  if (input.groupsCompleted >= 5) badges.push({ id: 'veteran', label: 'Veteran Saver', icon: '🎖️', color: 'purple' })
  else if (input.groupsCompleted >= 1) badges.push({ id: 'completer', label: 'Cycle Completer', icon: '🏁', color: 'indigo' })

  if (input.totalContributions >= 50) badges.push({ id: 'contributor_50', label: 'Super Contributor', icon: '💎', color: 'cyan' })
  else if (input.totalContributions >= 10) badges.push({ id: 'contributor_10', label: 'Active Contributor', icon: '⭐', color: 'amber' })

  if (input.streakDays >= 30) badges.push({ id: 'streak_30', label: '30-Day Streak', icon: '🔥', color: 'orange' })
  else if (input.streakDays >= 7) badges.push({ id: 'streak_7', label: '7-Day Streak', icon: '⚡', color: 'yellow' })

  if (input.points >= 5000) badges.push({ id: 'platinum', label: 'Platinum', icon: '🥇', color: 'slate' })
  else if (input.points >= 1000) badges.push({ id: 'gold', label: 'Gold', icon: '🥈', color: 'yellow' })

  return badges
}
