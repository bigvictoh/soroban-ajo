/**
 * metricsCollector.ts
 * Extends the existing Prometheus metrics with service-level and business metrics.
 */
import client from 'prom-client';
import { register } from '../services/metricsService';

// ── Service-level latency histogram ──────────────────────────────────────────
export const serviceOperationDuration = new client.Histogram({
  name: 'service_operation_duration_seconds',
  help: 'Duration of service-level operations in seconds',
  labelNames: ['service', 'operation', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// ── Health-check result gauge (1 = up, 0 = down) ─────────────────────────────
export const serviceHealthGauge = new client.Gauge({
  name: 'service_health_status',
  help: 'Health status of a service dependency (1=up, 0=down)',
  labelNames: ['service'],
  registers: [register],
});

// ── Response time gauge per dependency ───────────────────────────────────────
export const serviceResponseTimeMs = new client.Gauge({
  name: 'service_dependency_response_time_ms',
  help: 'Last measured response time (ms) for a service dependency',
  labelNames: ['service'],
  registers: [register],
});

// ── Threshold breach counter ──────────────────────────────────────────────────
export const responseTimeThresholdBreached = new client.Counter({
  name: 'service_response_time_threshold_breached_total',
  help: 'Number of times a dependency exceeded its response-time threshold',
  labelNames: ['service'],
  registers: [register],
});

// ── Consecutive failure gauge ─────────────────────────────────────────────────
export const serviceConsecutiveFailures = new client.Gauge({
  name: 'service_consecutive_failures',
  help: 'Number of consecutive health-check failures for a dependency',
  labelNames: ['service'],
  registers: [register],
});

// ── Alert counter ─────────────────────────────────────────────────────────────
export const alertsFiredTotal = new client.Counter({
  name: 'alerts_fired_total',
  help: 'Total number of alerts fired',
  labelNames: ['severity', 'service'],
  registers: [register],
});

// ── Error rate counter ────────────────────────────────────────────────────────
export const serviceErrorTotal = new client.Counter({
  name: 'service_errors_total',
  help: 'Total number of service-level errors',
  labelNames: ['service', 'operation', 'error_type'],
  registers: [register],
});

// ── Memory / CPU snapshot gauges ─────────────────────────────────────────────
export const processMemoryBytes = new client.Gauge({
  name: 'process_memory_heap_used_bytes_custom',
  help: 'Process heap memory used in bytes (custom snapshot)',
  registers: [register],
});

export const processCpuUsagePercent = new client.Gauge({
  name: 'process_cpu_usage_percent',
  help: 'Approximate CPU usage percentage sampled over 1 s',
  registers: [register],
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Record a service operation result and its duration. */
export function recordOperation(
  service: string,
  operation: string,
  status: 'success' | 'failure',
  durationMs: number,
): void {
  serviceOperationDuration.observe({ service, operation, status }, durationMs / 1000);
  if (status === 'failure') {
    serviceErrorTotal.inc({ service, operation, error_type: 'operation_failure' });
  }
}

/** Convenience wrapper: run an async fn and record its outcome. */
export async function trackOperation<T>(
  service: string,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  const end = serviceOperationDuration.startTimer({ service, operation });
  try {
    const result = await fn();
    end({ status: 'success' });
    return result;
  } catch (err) {
    end({ status: 'failure' });
    serviceErrorTotal.inc({ service, operation, error_type: 'exception' });
    throw err;
  }
}

/** Take a one-shot snapshot of memory and CPU and update gauges. */
export async function snapshotSystemMetrics(): Promise<void> {
  const mem = process.memoryUsage();
  processMemoryBytes.set(mem.heapUsed);

  const cpuBefore = process.cpuUsage();
  await new Promise<void>((r) => setTimeout(r, 100));
  const cpuAfter = process.cpuUsage(cpuBefore);
  const totalMicros = cpuAfter.user + cpuAfter.system;
  processCpuUsagePercent.set((totalMicros / 1_000_000 / 0.1) * 100);
}
