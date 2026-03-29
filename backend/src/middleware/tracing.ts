import { Request, Response, NextFunction } from 'express'
import { trace, SpanStatusCode, SpanKind } from '@opentelemetry/api'
import { getTracer } from '../utils/tracer'

export function tracingMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (process.env.OTEL_ENABLED !== 'true') {
    next()
    return
  }

  const tracer = getTracer()
  const spanName = `${req.method} ${req.route?.path ?? req.path}`

  tracer.startActiveSpan(
    spanName,
    { kind: SpanKind.SERVER },
    (span) => {
      span.setAttributes({
        'http.method': req.method,
        'http.url': req.originalUrl,
        'http.route': req.route?.path ?? req.path,
        'http.user_agent': req.headers['user-agent'] ?? '',
      })

      const traceId = span.spanContext().traceId
      res.setHeader('X-Trace-Id', traceId)

      res.on('finish', () => {
        span.setAttribute('http.status_code', res.statusCode)
        if (res.statusCode >= 500) {
          span.setStatus({ code: SpanStatusCode.ERROR })
        } else {
          span.setStatus({ code: SpanStatusCode.OK })
        }
        span.end()
      })

      next()
    }
  )
}
