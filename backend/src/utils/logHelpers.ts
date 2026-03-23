import type { Request } from 'express'

const REDACTED_VALUE = '[REDACTED]'
const MAX_STRING_LENGTH = 4000
const MAX_ARRAY_LENGTH = 50
const MAX_DEPTH = 6
const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|password|passwd|secret|token|api[-_]?key|private[-_]?key|passphrase|signature)/i

type AuthenticatedRequest = Request & {
  user?: {
    id?: string
    publicKey?: string
    email?: string
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export const serializeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    const errorWithContext = error as Error & {
      code?: string
      statusCode?: number
      details?: unknown
      cause?: unknown
    }

    return sanitizeLogData({
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: errorWithContext.code,
      statusCode: errorWithContext.statusCode,
      details: errorWithContext.details,
      cause: errorWithContext.cause,
    }) as Record<string, unknown>
  }

  return {
    message: typeof error === 'string' ? error : 'Unknown error',
    value: sanitizeLogData(error),
  }
}

export const sanitizeLogData = (
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>()
): unknown => {
  if (value === null || value === undefined) {
    return value
  }

  if (depth >= MAX_DEPTH) {
    return '[Truncated]'
  }

  if (value instanceof Error) {
    return serializeError(value)
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer:${value.length}]`
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeLogData(item, depth + 1, seen))
  }

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`
      : value
  }

  if (!isPlainObject(value)) {
    return value
  }

  if (seen.has(value)) {
    return '[Circular]'
  }

  seen.add(value)

  return Object.entries(value).reduce<Record<string, unknown>>((accumulator, [key, entryValue]) => {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      accumulator[key] = REDACTED_VALUE
      return accumulator
    }

    accumulator[key] = sanitizeLogData(entryValue, depth + 1, seen)
    return accumulator
  }, {})
}

export const getRequestUser = (req: Request) => {
  const request = req as AuthenticatedRequest
  return request.user
}

export const buildRequestContext = (
  req: Request,
  additionalContext: Record<string, unknown> = {}
) => {
  const user = getRequestUser(req)

  return sanitizeLogData({
    requestId: req.res?.locals?.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: user?.id || user?.publicKey,
    params: req.params,
    query: req.query,
    ...additionalContext,
  }) as Record<string, unknown>
}
