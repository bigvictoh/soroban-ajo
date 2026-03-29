import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { Pool, PoolConfig } from 'pg'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX ?? '10'),
  min: parseInt(process.env.DB_POOL_MIN ?? '2'),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT ?? '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT ?? '5000'),
  allowExitOnIdle: process.env.NODE_ENV !== 'production',
}

export const pool = new Pool(poolConfig)

pool.on('error', (err) => {
  console.error('Unexpected pg pool error', err)
})

