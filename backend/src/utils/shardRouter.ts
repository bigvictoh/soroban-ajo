import { Pool, PoolConfig } from 'pg'

export interface ShardConfig {
  id: number
  connectionString: string
  keyRange: {
    min: number
    max: number
  }
}

export class ShardRouter {
  private shards: Map<number, Pool> = new Map()
  private shardConfigs: ShardConfig[] = []

  constructor(configs: ShardConfig[]) {
    this.shardConfigs = configs
    this.initializeShards()
  }

  /**
   * Initialize shard pools
   */
  private initializeShards(): void {
    for (const config of this.shardConfigs) {
      const poolConfig: PoolConfig = {
        connectionString: config.connectionString,
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }

      const pool = new Pool(poolConfig)
      this.shards.set(config.id, pool)

      pool.on('error', (err) => {
        console.error(`Shard ${config.id} pool error:`, err)
      })
    }
  }

  /**
   * Calculate shard ID from key using consistent hashing
   */
  private getShardId(key: string): number {
    const hash = this.hashKey(key)
    const shard = this.shardConfigs.find((s) => hash >= s.keyRange.min && hash <= s.keyRange.max)

    if (!shard) {
      throw new Error(`No shard found for key: ${key}`)
    }

    return shard.id
  }

  /**
   * Simple hash function for key distribution
   */
  private hashKey(key: string): number {
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash) % 1000000
  }

  /**
   * Get shard pool for key
   */
  getShardPool(key: string): Pool {
    const shardId = this.getShardId(key)
    const pool = this.shards.get(shardId)

    if (!pool) {
      throw new Error(`Shard pool not found for ID: ${shardId}`)
    }

    return pool
  }

  /**
   * Execute query on appropriate shard
   */
  async executeOnShard(key: string, query: string, values?: any[]): Promise<any> {
    const pool = this.getShardPool(key)
    return pool.query(query, values)
  }

  /**
   * Get shard statistics
   */
  async getShardStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {}

    for (const [shardId, pool] of this.shards.entries()) {
      try {
        const result = await pool.query('SELECT COUNT(*) as count FROM information_schema.tables')
        stats[`shard_${shardId}`] = {
          status: 'healthy',
          tables: result.rows[0]?.count || 0,
        }
      } catch (error) {
        stats[`shard_${shardId}`] = {
          status: 'unhealthy',
          error: (error as Error).message,
        }
      }
    }

    return stats
  }

  /**
   * Close all shard connections
   */
  async closeAll(): Promise<void> {
    for (const pool of this.shards.values()) {
      await pool.end()
    }
  }
}

export function createShardRouter(shardCount: number = 4): ShardRouter {
  const configs: ShardConfig[] = []
  const rangePerShard = 1000000 / shardCount

  for (let i = 0; i < shardCount; i++) {
    configs.push({
      id: i,
      connectionString: process.env[`SHARD_${i}_DATABASE_URL`] || process.env.DATABASE_URL!,
      keyRange: {
        min: i * rangePerShard,
        max: (i + 1) * rangePerShard - 1,
      },
    })
  }

  return new ShardRouter(configs)
}
