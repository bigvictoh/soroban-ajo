import { logger } from '../utils/logger'

/**
 * DataDog APM integration via dd-trace.
 * No-op if DD_API_KEY is not set.
 *
 * Install: npm install dd-trace
 * Docs: https://docs.datadoghq.com/tracing/trace_collection/dd_libraries/nodejs/
 */
export function initDatadog() {
  if (!process.env.DD_API_KEY) {
    logger.info('DataDog DD_API_KEY not configured — APM disabled')
    return
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tracer = require('dd-trace')
    tracer.init({
      service: process.env.DD_SERVICE || 'ajo-backend',
      env: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '0.1.0',
      // Capture 100% of traces in dev, 10% in production
      sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Auto-instrument Express, pg, Redis, HTTP
      plugins: true,
      logInjection: true,
      runtimeMetrics: true,
    })
    logger.info('DataDog APM initialized', {
      service: process.env.DD_SERVICE || 'ajo-backend',
      env: process.env.NODE_ENV,
    })
  } catch {
    logger.warn('dd-trace not installed — run: npm install dd-trace')
  }
}
