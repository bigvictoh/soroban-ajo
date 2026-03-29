import { trace, context, SpanStatusCode, Tracer } from '@opentelemetry/api'

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? 'ajo-backend'

export function getTracer(name = SERVICE_NAME): Tracer {
  return trace.getTracer(name)
}

export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = getTracer()
  return tracer.startActiveSpan(name, async (span) => {
    if (attributes) {
      span.setAttributes(attributes)
    }
    try {
      const result = await fn()
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) })
      span.recordException(err as Error)
      throw err
    } finally {
      span.end()
    }
  })
}

export function getCurrentTraceId(): string | undefined {
  const span = trace.getActiveSpan()
  return span?.spanContext().traceId
}

export { context, trace }
