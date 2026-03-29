import { Pool, PoolClient } from 'pg'
import { pool } from '../config/database'
import logger from './logger'

export interface PoolStats {
  total: number
  idle: number
  waiting: number
}

export function getPoolStats(): PoolStats {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  }
}

export async function withConnection<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  return withConnection(async (client) => {
    await client.query('BEGIN')
    try {
      const result = await fn(client)
      await client.query('COMMIT')
      return result
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    }
  })
}

export async function checkPoolHealth(): Promise<boolean> {
  try {
    await pool.query('SELECT 1')
    return true
  } catch (err) {
    logger.error('Pool health check failed', { err })
    return false
  }
}

export async function closePool(): Promise<void> {
  await pool.end()
  logger.info('Database pool closed')
}

export { pool }
