import { Router } from 'express'
import { getSystemMetrics, getRequestMetrics, getRouteMetrics, getRecommendations } from '../middleware/performance'

export const metricsRouter = Router()

/**
 * GET /api/metrics
 * Full performance dashboard — system, requests, routes, recommendations
 */
metricsRouter.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      system: getSystemMetrics(),
      requests: getRequestMetrics(),
      routes: getRouteMetrics(),
      recommendations: getRecommendations(),
      timestamp: new Date().toISOString(),
    },
  })
})

/**
 * GET /api/metrics/system
 * System-level metrics (CPU, memory, uptime)
 */
metricsRouter.get('/system', (_req, res) => {
  res.json({ success: true, data: getSystemMetrics() })
})

/**
 * GET /api/metrics/requests
 * HTTP request performance metrics (avg, p95, p99, error rate, throughput)
 */
metricsRouter.get('/requests', (_req, res) => {
  res.json({ success: true, data: getRequestMetrics() })
})

/**
 * GET /api/metrics/routes
 * Per-route performance breakdown sorted by avg duration
 */
metricsRouter.get('/routes', (_req, res) => {
  res.json({ success: true, data: getRouteMetrics() })
})

/**
 * GET /api/metrics/recommendations
 * Actionable optimization recommendations based on current metrics
 */
metricsRouter.get('/recommendations', (_req, res) => {
  const recommendations = getRecommendations()
  const hasCritical = recommendations.some(r => r.severity === 'critical')
  res.json({
    success: true,
    data: {
      recommendations,
      summary: {
        total: recommendations.length,
        critical: recommendations.filter(r => r.severity === 'critical').length,
        warnings: recommendations.filter(r => r.severity === 'warning').length,
        healthy: !hasCritical,
      },
      timestamp: new Date().toISOString(),
    },
  })
})
