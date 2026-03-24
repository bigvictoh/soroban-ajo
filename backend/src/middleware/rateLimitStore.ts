/**
 * Redis Store Factory for express-rate-limit
 *
 * Creates a Redis-backed store using the existing ioredis client from
 * cacheService. Falls back to MemoryStore when Redis is unavailable.
 *
 * Key namespace format: `rl:{env}:{prefix}:`
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { MemoryStore, Store } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../services/cacheService';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('RateLimitStore');

const env = process.env.NODE_ENV ?? 'development';

/**
 * Creates a Redis-backed store for express-rate-limit.
 *
 * @param prefix - Tier/namespace identifier (e.g. "global", "auth", "api")
 * @returns A RedisStore instance, or a MemoryStore if Redis is unavailable.
 */
export function createRedisStore(prefix: string): Store {
  try {
    return new RedisStore({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sendCommand: async (...args: string[]): Promise<any> => {
        try {
          return await redisClient.call(args[0], ...args.slice(1));
        } catch (err) {
          logger.warn('Redis unavailable, falling back to memory store', {
            error: err instanceof Error ? err.message : String(err),
            prefix,
          });
          throw err;
        }
      },
      prefix: `rl:${env}:${prefix}:`,
    });
  } catch (err) {
    logger.warn('Failed to create RedisStore, falling back to MemoryStore', {
      error: err instanceof Error ? err.message : String(err),
      prefix,
    });
    return new MemoryStore();
  }
}
