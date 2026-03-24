/**
 * Rate Limiting Configuration
 *
 * Defines types and loads configuration for all rate limiting tiers.
 * Supports environment variable overrides with documented dev/prod defaults.
 *
 * Requirements: 4.1, 4.5, 4.6
 */

/** Configuration for a single rate limit tier */
export interface TierConfig {
  /** Sliding window duration in milliseconds */
  windowMs: number;
  /** Maximum requests allowed per window */
  max: number;
}

/** Rate limit configuration for all four tiers */
export interface ThrottleConfig {
  /** Global per-IP limit applied to all requests */
  global: TierConfig;
  /** Stricter limit for authentication endpoints */
  auth: TierConfig;
  /** Standard limit for general API endpoints */
  api: TierConfig;
  /** Tightest limit for resource-intensive endpoints */
  expensive: TierConfig;
}

/** DDoS detection and blocking configuration */
export interface DdosConfig {
  /** Detection window duration in milliseconds */
  windowMs: number;
  /** Request count threshold that triggers a block */
  threshold: number;
  /** How long a blocked IP remains blocked, in milliseconds */
  blockDurationMs: number;
}

/**
 * Full rate limiting configuration including throttle tiers, DDoS settings,
 * and the IP allowlist.
 */
export interface RateLimitConfig {
  throttle: ThrottleConfig;
  ddos: DdosConfig;
  /** IPs that bypass all rate limiting */
  ipAllowlist: string[];
}

/** Parse an env var as an integer, falling back to the provided default */
function envInt(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Load throttle and DDoS configuration from environment variables.
 *
 * All variables are optional. When absent, dev defaults are used in
 * NODE_ENV=development|test and prod defaults are used in NODE_ENV=production.
 *
 * Environment variable overrides:
 *
 * | Variable                        | Dev default | Prod default |
 * |---------------------------------|-------------|--------------|
 * | RATE_LIMIT_GLOBAL_WINDOW_MS     | 60000       | 60000        |
 * | RATE_LIMIT_GLOBAL_MAX           | 200         | 100          |
 * | RATE_LIMIT_AUTH_WINDOW_MS       | 900000      | 900000       |
 * | RATE_LIMIT_AUTH_MAX             | 20          | 10           |
 * | RATE_LIMIT_API_WINDOW_MS        | 900000      | 900000       |
 * | RATE_LIMIT_API_MAX              | 200         | 100          |
 * | RATE_LIMIT_EXPENSIVE_WINDOW_MS  | 3600000     | 3600000      |
 * | RATE_LIMIT_EXPENSIVE_MAX        | 20          | 10           |
 * | RATE_LIMIT_DDOS_WINDOW_MS       | 60000       | 60000        |
 * | RATE_LIMIT_DDOS_THRESHOLD       | 100         | 60           |
 * | RATE_LIMIT_DDOS_BLOCK_DURATION_MS | 600000    | 3600000      |
 * | RATE_LIMIT_IP_ALLOWLIST         | ""          | ""           |
 */
export function loadThrottleConfig(): RateLimitConfig {
  const isProd = process.env.NODE_ENV === 'production';

  const throttle: ThrottleConfig = {
    global: {
      windowMs: envInt('RATE_LIMIT_GLOBAL_WINDOW_MS', 60_000),
      max: envInt('RATE_LIMIT_GLOBAL_MAX', isProd ? 100 : 200),
    },
    auth: {
      windowMs: envInt('RATE_LIMIT_AUTH_WINDOW_MS', 900_000),
      max: envInt('RATE_LIMIT_AUTH_MAX', isProd ? 10 : 20),
    },
    api: {
      windowMs: envInt('RATE_LIMIT_API_WINDOW_MS', 900_000),
      max: envInt('RATE_LIMIT_API_MAX', isProd ? 100 : 200),
    },
    expensive: {
      windowMs: envInt('RATE_LIMIT_EXPENSIVE_WINDOW_MS', 3_600_000),
      max: envInt('RATE_LIMIT_EXPENSIVE_MAX', isProd ? 10 : 20),
    },
  };

  const ddos: DdosConfig = {
    windowMs: envInt('RATE_LIMIT_DDOS_WINDOW_MS', 60_000),
    threshold: envInt('RATE_LIMIT_DDOS_THRESHOLD', isProd ? 60 : 100),
    blockDurationMs: envInt('RATE_LIMIT_DDOS_BLOCK_DURATION_MS', isProd ? 3_600_000 : 600_000),
  };

  const allowlistRaw = process.env.RATE_LIMIT_IP_ALLOWLIST ?? '';
  const ipAllowlist = allowlistRaw
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);

  return { throttle, ddos, ipAllowlist };
}
