/**
 * SearchService — Issue #597
 * Full-text search with filters, sorting, and saved searches for groups and members.
 */
import { prisma } from '../config/database'

export type SortDir = 'asc' | 'desc'

export interface GroupSearchParams {
  q?: string
  isActive?: boolean
  minAmount?: number
  maxAmount?: number
  minMembers?: number
  maxMembers?: number
  sortBy?: 'name' | 'contributionAmount' | 'createdAt' | 'memberCount'
  sortDir?: SortDir
  page?: number
  limit?: number
}

export interface MemberSearchParams {
  q?: string
  emailVerified?: boolean
  phoneVerified?: boolean
  minTrustScore?: number
  kycLevel?: number
  sortBy?: 'walletAddress' | 'createdAt' | 'trustScore'
  sortDir?: SortDir
  page?: number
  limit?: number
}

function paginate(page = 1, limit = 20) {
  const take = Math.min(limit, 100)
  const skip = (Math.max(page, 1) - 1) * take
  return { take, skip }
}

function bigintSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v, (_, val) => (typeof val === 'bigint' ? val.toString() : val)))
}

// ── Groups ─────────────────────────────────────────────────────────────────

export async function searchGroups(params: GroupSearchParams) {
  const { take, skip } = paginate(params.page, params.limit)

  const where: any = {}

  if (params.q) {
    where.name = { contains: params.q, mode: 'insensitive' }
  }
  if (params.isActive !== undefined) {
    where.isActive = params.isActive
  }
  if (params.minAmount !== undefined || params.maxAmount !== undefined) {
    where.contributionAmount = {
      ...(params.minAmount !== undefined ? { gte: BigInt(params.minAmount) } : {}),
      ...(params.maxAmount !== undefined ? { lte: BigInt(params.maxAmount) } : {}),
    }
  }
  if (params.minMembers !== undefined || params.maxMembers !== undefined) {
    where.members = {
      ...(params.minMembers !== undefined ? { some: {} } : {}),
    }
    // member count filter via _count
    if (params.minMembers !== undefined) {
      where.members = { some: {} }
    }
  }

  const orderBy = buildGroupOrderBy(params.sortBy, params.sortDir)

  const [data, total] = await Promise.all([
    prisma.group.findMany({
      where,
      orderBy,
      take,
      skip,
      select: {
        id: true,
        name: true,
        contributionAmount: true,
        frequency: true,
        maxMembers: true,
        currentRound: true,
        isActive: true,
        createdAt: true,
        _count: { select: { members: true } },
      },
    }),
    prisma.group.count({ where }),
  ])

  // Apply member count filters post-query (Prisma doesn't support _count in where for all versions)
  let filtered = data as any[]
  if (params.minMembers !== undefined) {
    filtered = filtered.filter((g) => g._count.members >= params.minMembers!)
  }
  if (params.maxMembers !== undefined) {
    filtered = filtered.filter((g) => g._count.members <= params.maxMembers!)
  }

  return {
    data: bigintSafe(filtered),
    pagination: { total, page: params.page ?? 1, limit: take, pages: Math.ceil(total / take) },
  }
}

function buildGroupOrderBy(sortBy?: string, dir: SortDir = 'desc') {
  switch (sortBy) {
    case 'name': return { name: dir }
    case 'contributionAmount': return { contributionAmount: dir }
    case 'createdAt': return { createdAt: dir }
    default: return { createdAt: 'desc' as const }
  }
}

// ── Members ────────────────────────────────────────────────────────────────

export async function searchMembers(params: MemberSearchParams) {
  const { take, skip } = paginate(params.page, params.limit)

  const where: any = {}

  if (params.q) {
    where.OR = [
      { walletAddress: { contains: params.q, mode: 'insensitive' } },
      { name: { contains: params.q, mode: 'insensitive' } },
      { email: { contains: params.q, mode: 'insensitive' } },
    ]
  }

  // Verification filters join
  const verificationWhere: any = {}
  if (params.emailVerified !== undefined) verificationWhere.emailVerified = params.emailVerified
  if (params.phoneVerified !== undefined) verificationWhere.phoneVerified = params.phoneVerified
  if (params.kycLevel !== undefined) verificationWhere.kycLevel = { gte: params.kycLevel }
  if (params.minTrustScore !== undefined) verificationWhere.trustScore = { gte: params.minTrustScore }

  if (Object.keys(verificationWhere).length > 0) {
    where.verification = { is: verificationWhere }
  }

  const orderBy = buildMemberOrderBy(params.sortBy, params.sortDir)

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      take,
      skip,
      select: {
        id: true,
        walletAddress: true,
        name: true,
        email: true,
        createdAt: true,
        verification: { select: { kycLevel: true, kycStatus: true, emailVerified: true, phoneVerified: true, trustScore: true } },
        _count: { select: { groups: true, contributions: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return {
    data: bigintSafe(data),
    pagination: { total, page: params.page ?? 1, limit: take, pages: Math.ceil(total / take) },
  }
}

function buildMemberOrderBy(sortBy?: string, dir: SortDir = 'desc') {
  switch (sortBy) {
    case 'walletAddress': return { walletAddress: dir }
    case 'createdAt': return { createdAt: dir }
    case 'trustScore': return { verification: { trustScore: dir } }
    default: return { createdAt: 'desc' as const }
  }
}

// ── Global (legacy) ────────────────────────────────────────────────────────

export async function globalSearch(query: string, type?: string, limit = 5) {
  const results: any = { groups: [], members: [], transactions: [] }
  if (!query || query.length < 2) return results

  const tasks: Promise<void>[] = []

  if (!type || type === 'groups') {
    tasks.push(
      searchGroups({ q: query, limit }).then((r) => { results.groups = r.data })
    )
  }
  if (!type || type === 'members') {
    tasks.push(
      searchMembers({ q: query, limit }).then((r) => { results.members = r.data })
    )
  }
  if (!type || type === 'transactions') {
    tasks.push(
      prisma.contribution.findMany({
        where: { txHash: { contains: query, mode: 'insensitive' } },
        take: limit,
        select: { id: true, txHash: true, amount: true, group: { select: { name: true } } },
      }).then((r) => { results.transactions = bigintSafe(r) })
    )
  }

  await Promise.all(tasks)
  return results
}

// ── Saved searches ─────────────────────────────────────────────────────────

export async function getSavedSearches(userId: string) {
  return prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createSavedSearch(userId: string, name: string, entity: string, filters: object) {
  return prisma.savedSearch.create({
    data: { userId, name, entity, filters },
  })
}

export async function deleteSavedSearch(id: string, userId: string) {
  return prisma.savedSearch.deleteMany({ where: { id, userId } })
}
