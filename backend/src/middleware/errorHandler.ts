import { Request, Response, NextFunction } from 'express'
import { captureMonitoringError } from '../config/logger.config'
import { createModuleLogger } from '../utils/logger'
import { AppError, ErrorFactory } from '../errors/AppError'
import { ZodError } from 'zod'
import { buildRequestContext, sanitizeLogData, serializeError } from '../utils/logHelpers'

const logger = createModuleLogger('ErrorHandler')

// Re-export AppError for use in other modules
export { AppError, ErrorFactory } from '../errors/AppError'

/**
 * Global error handling middleware
 * Converts all errors to consistent API responses
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Convert unknown errors to AppError
  let error: AppError

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    error = new AppError(
      'Validation failed',
      'VALIDATION_ERROR',
      400,
      err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }))
    )
  } else if (err instanceof AppError) {
    error = err
  } else {
    error = ErrorFactory.fromUnknown(err)
  }

  // Log error with appropriate level
  const logLevel = error.statusCode >= 500 ? 'error' : 'warn'
  const logPayload = {
    ...buildRequestContext(req, {
      requestId: res.locals.requestId,
      statusCode: error.statusCode,
      body: sanitizeLogData(req.body),
      headers: sanitizeLogData({
        'user-agent': req.get('user-agent'),
        'x-forwarded-for': req.get('x-forwarded-for'),
      }),
    }),
    error: serializeError(error),
  }

  logger.log(logLevel, 'Request failed', logPayload)

  if (error.statusCode >= 500 || !error.isOperational) {
    captureMonitoringError(err, logPayload)
  }

  const responsePayload = {
    success: false,
    error: error.message,
    code: error.code,
    requestId: res.locals.requestId,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  }

  res.status(error.statusCode).json(responsePayload)
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  logger.warn('Route not found', buildRequestContext(req))
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.path,
    requestId: res.locals.requestId,
  })
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error middleware
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
