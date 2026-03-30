import { ShardRouter, ShardConfig } from '../utils/shardRouter'

export interface ShardingConfig {
  enabled: boolean
  shardCount: number
  shardKey: string // Field to use for sharding (e.g., 'userId', 'groupId')
  strategy: 'hash' | 'range' | 'directory'
}

export const defaultShardingConfig: ShardingConfig = {
  enabled: process.env.SHARDING_ENABLED === 'true',
  shardCount: parseInt(process.env.SHARD_COUNT || '4'),
  shardKey: process.env.SHARD_KEY || 'userId',
  strategy: (process.env.SHARD_STRATEGY as any) || 'hash',
}

/**
 * Initialize sharding based on configuration
 */
export function initializeSharding(config: ShardingConfig): ShardRouter | null {
  if (!config.enabled) {
    return null
  }

  const shardConfigs: ShardConfig[] = []
  const rangePerShard = 1000000 / config.shardCount

  for (let i = 0; i < config.shardCount; i++) {
    const connectionString = process.env[`SHARD_${i}_DATABASE_URL`] || process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error(`Missing database URL for shard ${i}`)
    }

    shardConfigs.push({
      id: i,
      connectionString,
      keyRange: {
        min: i * rangePerShard,
        max: (i + 1) * rangePerShard - 1,
      },
    })
  }

  return new ShardRouter(shardConfigs)
}

export const shardRouter = initializeSharding(defaultShardingConfig)
