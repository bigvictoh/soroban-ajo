import fs from 'fs'
import path from 'path'
import * as Sentry from '@sentry/node'
import { sanitizeLogData } from '../utils/logHelpers'

const parseBoolean = (value?: string): boolean => {
  if (!value) {
    return false
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export const loggerConfig = {
  serviceName: process.env.LOG_SERVICE_NAME || 'ajo-backend',
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === 'production'
      ? 'info'
      : process.env.NODE_ENV === 'test'
      ? 'warn'
      : 'debug'),
  directory: path.resolve(process.cwd(), 'logs'),
  consoleEnabled: process.env.NODE_ENV !== 'production' || parseBoolean(process.env.LOG_TO_CONSOLE),
  monitoringEnabled: Boolean(process.env.SENTRY_DSN),
  sentryDsn: process.env.SENTRY_DSN,
  sentryEnvironment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  sentryTracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || '0'),
} as const

let monitoringInitialized = false

export const ensureLogDirectory = () => {
  fs.mkdirSync(loggerConfig.directory, { recursive: true })
}

export const initializeMonitoring = () => {
  if (!loggerConfig.monitoringEnabled || monitoringInitialized || !loggerConfig.sentryDsn) {
    return
  }

  Sentry.init({
    dsn: loggerConfig.sentryDsn,
    environment: loggerConfig.sentryEnvironment,
    release: process.env.APP_VERSION || process.env.npm_package_version,
    tracesSampleRate: Number.isFinite(loggerConfig.sentryTracesSampleRate)
      ? loggerConfig.sentryTracesSampleRate
      : 0,
    enabled: loggerConfig.monitoringEnabled,
  })

  monitoringInitialized = true
}

export const captureMonitoringError = (error: unknown, context?: Record<string, unknown>) => {
  if (!loggerConfig.monitoringEnabled) {
    return
  }

  initializeMonitoring()

  const sanitizedContext = sanitizeLogData(context || {}) as Record<string, unknown>

  Sentry.withScope((scope) => {
    Object.entries(sanitizedContext).forEach(([key, value]) => {
      scope.setExtra(key, value)
    })

    if (error instanceof Error) {
      Sentry.captureException(error)
      return
    }

    Sentry.captureMessage(typeof error === 'string' ? error : 'Non-error exception captured')
  })
}
