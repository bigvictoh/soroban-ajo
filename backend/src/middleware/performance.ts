import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import os from 'os'

// Performance budgets
const BUDGETS = {
  apiResponseTime: 500,    // ms
  slowQueryTime: 1000,     // ms
  criticalResponseTime: 2000, // ms
}

// In-memory metrics store (replace with Redis/Prometheus in production)
interface RequestMetric {
  method: string
  route: string
  statusCode: number
  duration: number
  timestamp: number
  memoryUsage: number
}

const metricsStore: RequestMetric[] = []
const MAX_METRICS = 5000

export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint()
  const startMemory = process.memoryUsage().heapUsed

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start
    const durationMs = Number(durationNs) / 1_000_000
    const memoryDelta = process.memoryUsage().heapUsed - startMemory

    const route = (req.route?.path as string) || req.path
    const metric: RequestMetric = {
      method: req.method,
      route,
      statusCode: res.statusCode,
      duration: durationMs,
      timestamp: Date.now(),
      memoryUsage: memoryDelta,
    }

    // Store metric (circular buffer)
    metricsStore.push(metric)
    if (metricsStore.length > MAX_METRICS) {
      metricsStore.shift()
    }

    // Set response time header
    res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`)

    // Alert on budget violations
    if (durationMs > BUDGETS.criticalResponseTime) {
      logger.error('Critical response time budget exceeded', {
        route,
        method: req.method,
        duration: `${durationMs.toFixed(2)}ms`,
        budget: `${BUDGETS.criticalResponseTime}ms`,
      })
    } else if (durationMs > BUDGETS.apiResponseTime) {
      logger.warn('API response time budget exceeded', {
        route,
        method: req.method,
        duration: `${durationMs.toFixed(2)}ms`,
        budget: `${BUDGETS.apiResponseTime}ms`,
      })
    }
  })

  next()
}

export function getSystemMetrics() {
  const mem = process.memoryUsage()
  const cpus = os.cpus()
  const totalCpuTime = cpus.reduce((acc, cpu) => {
    const times = cpu.times
    return acc + times.user + times.nice + times.sys + times.idle + times.irq
  }, 0)
  const idleCpuTime = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0)
  const cpuUsagePercent = ((1 - idleCpuTime / totalCpuTime) * 100).toFixed(2)

  return {
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),   // MB
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),  // MB
      rss: Math.round(mem.rss / 1024 / 1024),              // MB
      external: Math.round(mem.external / 1024 / 1024),    // MB
    },
    cpu: {
      usagePercent: parseFloat(cpuUsagePercent),
      cores: cpus.length,
      model: cpus[0]?.model || 'unknown',
    },
    uptime: Math.round(process.uptime()),
    nodeVersion: process.version,
    platform: process.platform,
  }
}

export function getRequestMetrics() {
  if (metricsStore.length === 0) {
    return { count: 0, avgDuration: 0, p95: 0, p99: 0, errorRate: 0, throughput: 0 }
  }

  const durations = metricsStore.map(m => m.duration).sort((a, b) => a - b)
  const errors = metricsStore.filter(m => m.statusCode >= 500).length
  const now = Date.now()
  const oneMinuteAgo = now - 60_000
  const recentRequests = metricsStore.filter(m => m.timestamp > oneMinuteAgo).length

  const p95Index = Math.floor(durations.length * 0.95)
  const p99Index = Math.floor(durations.length * 0.99)

  return {
    count: metricsStore.length,
    avgDuration: parseFloat((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2)),
    p95: parseFloat((durations[p95Index] || 0).toFixed(2)),
    p99: parseFloat((durations[p99Index] || 0).toFixed(2)),
    errorRate: parseFloat(((errors / metricsStore.length) * 100).toFixed(2)),
    throughput: recentRequests, // requests per last minute
    budgets: BUDGETS,
  }
}

export function getRouteMetrics() {
  const routeMap = new Map<string, { count: number; totalDuration: number; errors: number }>()

  for (const metric of metricsStore) {
    const key = `${metric.method} ${metric.route}`
    const existing = routeMap.get(key) || { count: 0, totalDuration: 0, errors: 0 }
    existing.count++
    existing.totalDuration += metric.duration
    if (metric.statusCode >= 500) existing.errors++
    routeMap.set(key, existing)
  }

  return Array.from(routeMap.entries()).map(([route, stats]) => ({
    route,
    count: stats.count,
    avgDuration: parseFloat((stats.totalDuration / stats.count).toFixed(2)),
    errorRate: parseFloat(((stats.errors / stats.count) * 100).toFixed(2)),
  })).sort((a, b) => b.avgDuration - a.avgDuration)
}

export interface Recommendation {
  severity: 'critical' | 'warning' | 'info'
  category: 'api' | 'database' | 'memory' | 'cpu' | 'error-rate'
  message: string
  detail: string
}

/**
 * Analyze current metrics and return actionable optimization recommendations.
 */
export function getRecommendations(): Recommendation[] {
  const recommendations: Recommendation[] = []
  const system = getSystemMetrics()
  const requests = getRequestMetrics()
  const routes = getRouteMetrics()

  // ── API response time ──────────────────────────────────────────────────────
  if (requests.p99 > BUDGETS.criticalResponseTime) {
    recommendations.push({
      severity: 'critical',
      category: 'api',
      message: `p99 response time is ${requests.p99}ms — exceeds critical budget of ${BUDGETS.criticalResponseTime}ms`,
      detail: 'Investigate slow routes below. Consider adding caching (Redis), database indexes, or horizontal scaling.',
    })
  } else if (requests.p95 > BUDGETS.apiResponseTime) {
    recommendations.push({
      severity: 'warning',
      category: 'api',
      message: `p95 response time is ${requests.p95}ms — exceeds budget of ${BUDGETS.apiResponseTime}ms`,
      detail: 'Review the slowest routes and add response caching or query optimization.',
    })
  }

  // ── Slow routes ────────────────────────────────────────────────────────────
  for (const route of routes.slice(0, 3)) {
    if (route.avgDuration > BUDGETS.apiResponseTime) {
      recommendations.push({
        severity: route.avgDuration > BUDGETS.criticalResponseTime ? 'critical' : 'warning',
        category: 'api',
        message: `Route "${route.route}" avg ${route.avgDuration}ms (${route.count} requests)`,
        detail: 'Add route-level caching, optimize database queries, or move heavy work to a background job.',
      })
    }
  }

  // ── Error rate ─────────────────────────────────────────────────────────────
  if (requests.errorRate > 5) {
    recommendations.push({
      severity: 'critical',
      category: 'error-rate',
      message: `Error rate is ${requests.errorRate}% — above 5% threshold`,
      detail: 'Check application logs and Sentry for recurring errors. High error rates degrade user experience.',
    })
  } else if (requests.errorRate > 1) {
    recommendations.push({
      severity: 'warning',
      category: 'error-rate',
      message: `Error rate is ${requests.errorRate}% — above 1% target`,
      detail: 'Review recent error logs. Consider adding retry logic for transient failures.',
    })
  }

  // ── Memory ─────────────────────────────────────────────────────────────────
  const heapPercent = (system.memory.heapUsed / system.memory.heapTotal) * 100
  if (heapPercent > 90) {
    recommendations.push({
      severity: 'critical',
      category: 'memory',
      message: `Heap usage is ${heapPercent.toFixed(1)}% (${system.memory.heapUsed}MB / ${system.memory.heapTotal}MB)`,
      detail: 'Memory pressure is critical. Check for memory leaks, large in-memory caches, or increase Node.js heap size with --max-old-space-size.',
    })
  } else if (heapPercent > 75) {
    recommendations.push({
      severity: 'warning',
      category: 'memory',
      message: `Heap usage is ${heapPercent.toFixed(1)}% (${system.memory.heapUsed}MB / ${system.memory.heapTotal}MB)`,
      detail: 'Consider reviewing in-memory data structures and enabling heap snapshots to detect leaks.',
    })
  }

  // ── CPU ────────────────────────────────────────────────────────────────────
  if (system.cpu.usagePercent > 80) {
    recommendations.push({
      severity: 'critical',
      category: 'cpu',
      message: `CPU usage is ${system.cpu.usagePercent}% across ${system.cpu.cores} cores`,
      detail: 'CPU is saturated. Move CPU-intensive work to worker threads or background jobs, and consider horizontal scaling.',
    })
  } else if (system.cpu.usagePercent > 60) {
    recommendations.push({
      severity: 'warning',
      category: 'cpu',
      message: `CPU usage is ${system.cpu.usagePercent}% across ${system.cpu.cores} cores`,
      detail: 'CPU load is elevated. Profile hot code paths and consider caching computed results.',
    })
  }

  // ── All good ───────────────────────────────────────────────────────────────
  if (recommendations.length === 0) {
    recommendations.push({
      severity: 'info',
      category: 'api',
      message: 'All metrics are within budget',
      detail: `p95: ${requests.p95}ms, error rate: ${requests.errorRate}%, heap: ${heapPercent.toFixed(1)}%, CPU: ${system.cpu.usagePercent}%`,
    })
  }

  return recommendations
}
