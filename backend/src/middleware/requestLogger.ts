import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'
import { logger } from '../utils/logger'
import { buildRequestContext, sanitizeLogData } from '../utils/logHelpers'

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = randomUUID()
  const start = Date.now()
  let logged = false

  // Attach requestId so controllers/errors can reference it
  res.locals.requestId = requestId
  res.setHeader('X-Request-Id', requestId)

  const logRequest = (event: 'finish' | 'close') => {
    if (logged) {
      return
    }

    logged = true
    const duration = Date.now() - start
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http'

    logger.log(level, 'HTTP request completed', {
      ...buildRequestContext(req, {
        requestId,
        event,
        statusCode: res.statusCode,
        durationMs: duration,
        contentLength: res.getHeader('content-length'),
        body: res.statusCode >= 500 ? sanitizeLogData(req.body) : undefined,
      }),
      status: res.statusCode,
      duration: `${duration}ms`,
    })
  }

  res.on('finish', () => logRequest('finish'))
  res.on('close', () => logRequest('close'))

  next()
}
