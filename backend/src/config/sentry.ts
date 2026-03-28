import * as Sentry from '@sentry/node'
import { logger } from '../utils/logger'

/**
 * Initialize Sentry for backend error tracking and performance monitoring.
 * No-op if SENTRY_DSN is not set.
 */
export function initSentry() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    logger.info('Sentry DSN not configured — error tracking disabled')
    return
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    // Capture 100% of transactions in dev, 10% in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Capture 100% of errors
    sampleRate: 1.0,
    integrations: [
      // HTTP request tracing
      Sentry.httpIntegration(),
      // Express request handler
      Sentry.expressIntegration(),
    ],
    beforeSend(event) {
      // Strip PII from request data
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
      }
      return event
    },
  })

  logger.info('Sentry initialized', { environment: process.env.NODE_ENV })
}

/**
 * Capture an exception manually (e.g. from a caught error that shouldn't crash).
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!process.env.SENTRY_DSN) return
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context)
    Sentry.captureException(error)
  })
}

/**
 * Sentry Express error handler — must be registered AFTER all routes.
 */
export { Sentry }
