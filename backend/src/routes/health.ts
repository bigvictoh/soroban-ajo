import { Router } from 'express';
import { HealthCheckService } from '../services/healthCheck';
import { register } from '../services/metricsService';
import { healthMonitor } from '../monitoring/healthMonitor';
import { alertingService, AlertSeverity } from '../monitoring/alerting';

const router = Router();
const healthCheck = new HealthCheckService();

// Upstream addition: Base route
router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ajo-backend',
    version: '0.1.0'
  });
});

// Liveness probe (is the app running?)
router.get('/health/live', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness probe (is the app ready to serve traffic?)
router.get('/health/ready', async (req, res) => {
  const health = await healthCheck.getHealthStatus();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Detailed health check
router.get('/health', async (req, res) => {
  const health = await healthCheck.getHealthStatus();
  res.json(health);
});

// Metrics endpoint for Prometheus
router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Live monitor snapshot with system metrics
router.get('/health/monitor', (_req, res) => {
  const snapshot = healthMonitor.getLastSnapshot();
  const status = healthMonitor.getStatus();
  res.json({ status, snapshot });
});

// Active alerts only
router.get('/health/monitor/alerts/active', (_req, res) => {
  res.json({ alerts: alertingService.getActiveAlerts() });
});

// Alert history with optional ?severity=&service= filters
router.get('/health/monitor/alerts', (req, res) => {
  const { severity, service, activeOnly } = req.query as Record<string, string>;
  const filter: Parameters<typeof alertingService.getHistory>[0] = {};
  if (severity) filter.severity = severity as AlertSeverity;
  if (service) filter.service = service;
  if (activeOnly === 'true') filter.activeOnly = true;
  const alerts = alertingService.getHistory(filter);
  res.json({ total: alerts.length, alerts });
});

export const healthRouter = router;