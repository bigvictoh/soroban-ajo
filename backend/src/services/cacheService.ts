import Redis from 'ioredis'
import { dbService } from './databaseService'
import { SorobanService } from './sorobanService'
import { logger } from '../utils/logger'

export const redisClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  lazyConnect: true,
  enableOfflineQueue: false,
})

redisClient.on('error', (err) => logger.warn('Redis error', { error: err.message }))

const sorobanService = new SorobanService()

// ── Key patterns ──────────────────────────────────────────────────────────────

export const CacheKeys = {
  group: (id: string) => `group:${id}`,
  allGroups: () => 'groups:all',
  userMetrics: (id: string) => `user:metrics:${id}`,
  groupMetrics: (id: string) => `group:metrics:${id}`,
} as const

// ── Core helpers ──────────────────────────────────────────────────────────────

export async function cacheSet(key: string, value: string, ttlSeconds = 60) {
  return redisClient.set(key, value, 'EX', ttlSeconds)
}

export async function cacheGet(key: string): Promise<string | null> {
  return redisClient.get(key)
}

export async function cacheDel(key: string) {
  return redisClient.del(key)
}

// ── Invalidation ──────────────────────────────────────────────────────────────

/**
 * Deletes all keys matching a glob pattern using SCAN (non-blocking).
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  let cursor = '0'
  let deleted = 0
  do {
    const [next, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
    cursor = next
    if (keys.length) {
      await redisClient.del(...keys)
      deleted += keys.length
    }
  } while (cursor !== '0')
  logger.debug('Cache invalidated', { pattern, deleted })
  return deleted
}

/** Invalidates all cached data for a specific group. */
export async function invalidateGroup(groupId: string) {
  await Promise.all([
    cacheDel(CacheKeys.group(groupId)),
    cacheDel(CacheKeys.groupMetrics(groupId)),
    cacheDel(CacheKeys.allGroups()),
  ])
}

// ── Cache warming ─────────────────────────────────────────────────────────────

/**
 * Pre-populates Redis with active groups from the database.
 * Call on startup or after a cache flush.
 */
export async function warmCache(): Promise<{ warmed: number }> {
  let warmed = 0
  try {
    const groups = await dbService.getAllGroups()
    await Promise.all(
      groups.map(async (group) => {
        await cacheSet(CacheKeys.group(group.id), JSON.stringify(group), 300)
        warmed++
      })
    )
    await cacheSet(CacheKeys.allGroups(), JSON.stringify(groups), 300)
    logger.info('Cache warmed', { warmed })
  } catch (err) {
    logger.error('Cache warming failed', { error: err instanceof Error ? err.message : String(err) })
  }
  return { warmed }
}

// ── Redis metrics ─────────────────────────────────────────────────────────────

export async function getRedisMetrics() {
  try {
    const info = await redisClient.info()
    const parse = (key: string): string => {
      const match = info.match(new RegExp(`${key}:(\\S+)`))
      return match ? match[1] : '0'
    }
    return {
      connected: redisClient.status === 'ready',
      usedMemoryHuman: parse('used_memory_human'),
      connectedClients: parseInt(parse('connected_clients'), 10),
      totalCommandsProcessed: parseInt(parse('total_commands_processed'), 10),
      keyspaceHits: parseInt(parse('keyspace_hits'), 10),
      keyspaceMisses: parseInt(parse('keyspace_misses'), 10),
      hitRate: (() => {
        const hits = parseInt(parse('keyspace_hits'), 10)
        const misses = parseInt(parse('keyspace_misses'), 10)
        const total = hits + misses
        return total > 0 ? Math.round((hits / total) * 100) : 0
      })(),
      uptimeSeconds: parseInt(parse('uptime_in_seconds'), 10),
    }
  } catch {
    return { connected: false }
  }
}

// ── Group fetch with caching ──────────────────────────────────────────────────

export async function getGroupWithCache(groupId: string) {
  const key = CacheKeys.group(groupId)
  const cached = await redisClient.get(key)
  if (cached) return JSON.parse(cached)

  const dbGroup = await dbService.getGroup(groupId)
  if (dbGroup) {
    await cacheSet(key, JSON.stringify(dbGroup), 300)
    return dbGroup
  }

  const blockchainData = await sorobanService.getGroup(groupId)
  if (!blockchainData) throw new Error('Group not found on blockchain')

  const freqMap: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 }
  const upserted = await dbService.upsertGroup(groupId, {
    name: blockchainData.name,
    contributionAmount: BigInt(blockchainData.contributionAmount),
    frequency: freqMap[blockchainData.frequency] ?? 30,
    maxMembers: blockchainData.maxMembers,
    isActive: blockchainData.isActive,
  })
  await cacheSet(key, JSON.stringify(upserted), 300)
  return upserted
}

export async function recordContribution(groupId: string, walletAddress: string, amount: bigint, round: number, txHash: string) {
  const existing = await dbService.getContributionByTxHash(txHash)
  if (existing) return existing
  const result = await dbService.addContribution({ groupId, walletAddress, amount, round, txHash })
  await invalidateGroup(groupId)
  return result
}

export async function getAllGroupsFast() {
  const cached = await cacheGet(CacheKeys.allGroups())
  if (cached) return JSON.parse(cached)
  const groups = await dbService.getAllGroups()
  await cacheSet(CacheKeys.allGroups(), JSON.stringify(groups), 300)
  return groups
}
