/**
 * DDoS Protector Middleware
 *
 * Detects and blocks IPs that exceed the configured DDoS threshold within
 * a short detection window. Blocked IPs are stored in Redis with a TTL
 * equal to the configured block duration.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.2, 7.3
 */

import rateLimit from 'express-rate-limit';
import { RequestHandler, Request, Response, NextFunction } from 'express';
import { loadThrottleConfig } from './rateLimitConfig';
import { createRedisStore } from './rateLimitStore';
import { incrementDdosCount } from './rateLimitMetrics';
import { redisClient } from '../services/cacheService';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('DDoSProtector');

// Load config once at module load time
const config = loadThrottleConfig();

/** Extract client IP from request (X-Forwarded-For first, then socket, then "unknown") */
function extractIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
      .split(',')[0]
      .trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

/**
 * Creates the DDoS protector middleware.
 *
 * On each request:
 * 1. Checks if the IP is currently blocked in Redis (`ddos:block:{ip}`).
 *    If blocked, returns 429 immediately with Retry-After.
 * 2. Tracks request rate via a dedicated express-rate-limit instance.
 *    When the threshold is exceeded, blocks the IP in Redis and returns 429.
 * 3. If neither blocked nor threshold exceeded, calls next().
 */
export function createDdosProtector(): RequestHandler {
  const ttlSeconds = Math.ceil(config.ddos.blockDurationMs / 1000);

  // Dedicated rate limiter for DDoS detection only
  const ddosRateLimiter = rateLimit({
    windowMs: config.ddos.windowMs,
    max: config.ddos.threshold,
    standardHeaders: false,
    legacyHeaders: false,
    store: createRedisStore('ddos:rate'),
    keyGenerator: extractIp,
    // handler is invoked when threshold is exceeded
    handler: async (req: Request, res: Response) => {
      const ip = extractIp(req);
      const blockKey = `ddos:block:${ip}`;

      // Store block record in Redis with TTL
      await redisClient.set(blockKey, '1', 'EX', ttlSeconds);

      incrementDdosCount();

      logger.error('DDoS block issued', {
        ip,
        detectedRate: config.ddos.threshold,
        blockDurationMs: config.ddos.blockDurationMs,
        timestamp: new Date().toISOString(),
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Retry-After', String(ttlSeconds));
      res.status(429).json({
        status: 429,
        error: 'Too many requests - your IP has been temporarily blocked',
        retryAfter: ttlSeconds,
      });
    },
  });

  // Composed middleware: check block first, then run rate limiter
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = extractIp(req);
    const blockKey = `ddos:block:${ip}`;

    // Check if IP is currently blocked
    const isBlocked = await redisClient.exists(blockKey);
    if (isBlocked) {
      const ttl = await redisClient.ttl(blockKey);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Retry-After', String(ttl));
      res.status(429).json({
        status: 429,
        error: 'Too many requests - your IP has been temporarily blocked',
        retryAfter: ttl,
      });
      return;
    }

    // Run the DDoS rate limiter; it will call next() if within threshold
    ddosRateLimiter(req, res, next);
  };
}
