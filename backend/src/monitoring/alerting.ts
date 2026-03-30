/**
 * alerting.ts
 * Alerting service with cooldowns, active-alert tracking, resolve support,
 * severity filtering, and a pluggable webhook dispatch hook.
 */
import { createModuleLogger } from '../utils/logger';
import { alertsFiredTotal } from './metricsCollector';

const logger = createModuleLogger('AlertingService');

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export interface Alert {
  severity: AlertSeverity;
  service: string;
  message: string;
  details?: string;
}

export interface AlertRecord extends Alert {
  id: string;
  firedAt: Date;
  resolvedAt?: Date;
  active: boolean;
}

export interface AlertHistoryFilter {
  severity?: AlertSeverity;
  service?: string;
  activeOnly?: boolean;
}

const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
let _idCounter = 0;
function nextId(): string {
  return `alert-${Date.now()}-${++_idCounter}`;
}

export class AlertingService {
  private readonly cooldowns = new Map<string, Date>();
  private readonly cooldownMs: number;
  private readonly history: AlertRecord[] = [];
  private readonly maxHistory = 500;

  /** active alerts keyed by `service:severity` */
  private readonly active = new Map<string, AlertRecord>();

  constructor(cooldownMs = DEFAULT_COOLDOWN_MS) {
    this.cooldownMs = cooldownMs;
  }

  /**
   * Fire an alert. Skipped if the same service+severity fired within the cooldown window.
   */
  async fire(alert: Alert): Promise<void> {
    const key = `${alert.service}:${alert.severity}`;
    const lastFired = this.cooldowns.get(key);
    const now = new Date();

    if (lastFired && now.getTime() - lastFired.getTime() < this.cooldownMs) {
      logger.debug('Alert suppressed (cooldown)', { key });
      return;
    }

    this.cooldowns.set(key, now);

    const record: AlertRecord = {
      id: nextId(),
      ...alert,
      firedAt: now,
      active: true,
    };

    this.active.set(key, record);
    this.push(record);

    alertsFiredTotal.inc({ severity: alert.severity, service: alert.service });

    const meta = { service: alert.service, severity: alert.severity, details: alert.details };
    switch (alert.severity) {
      case AlertSeverity.CRITICAL:
        logger.error(`[ALERT] ${alert.message}`, meta);
        break;
      case AlertSeverity.WARNING:
        logger.warn(`[ALERT] ${alert.message}`, meta);
        break;
      default:
        logger.info(`[ALERT] ${alert.message}`, meta);
    }

    await this.dispatch(record);
  }

  /**
   * Resolve an active alert for a given service + severity.
   * Marks it inactive and logs the recovery.
   */
  resolve(service: string, severity: AlertSeverity): void {
    const key = `${service}:${severity}`;
    const record = this.active.get(key);
    if (!record) return;

    record.active = false;
    record.resolvedAt = new Date();
    this.active.delete(key);
    // Reset cooldown so a new alert can fire immediately after recovery
    this.cooldowns.delete(key);

    logger.info(`[RESOLVED] ${service} ${severity} alert cleared`, {
      service,
      severity,
      durationMs: record.resolvedAt.getTime() - record.firedAt.getTime(),
    });
  }

  /**
   * Return alert history, optionally filtered.
   */
  getHistory(filter?: AlertHistoryFilter): AlertRecord[] {
    let results = [...this.history];
    if (filter?.severity) results = results.filter((a) => a.severity === filter.severity);
    if (filter?.service) results = results.filter((a) => a.service === filter.service);
    if (filter?.activeOnly) results = results.filter((a) => a.active);
    return results;
  }

  /** Return currently active alerts. */
  getActiveAlerts(): AlertRecord[] {
    return Array.from(this.active.values());
  }

  /** Clear cooldown state (useful in tests). */
  resetCooldowns(): void {
    this.cooldowns.clear();
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private push(record: AlertRecord): void {
    this.history.push(record);
    if (this.history.length > this.maxHistory) this.history.shift();
  }

  /**
   * Webhook dispatch — extend to push to Slack / PagerDuty / SNS.
   * Reads ALERT_WEBHOOK_URL from env if set.
   */
  protected async dispatch(record: AlertRecord): Promise<void> {
    const webhookUrl = process.env['ALERT_WEBHOOK_URL'];
    if (!webhookUrl) return;

    const payload = JSON.stringify({
      id: record.id,
      severity: record.severity,
      service: record.service,
      message: record.message,
      details: record.details,
      firedAt: record.firedAt.toISOString(),
    });

    try {
      // Use http/https module to avoid requiring DOM fetch types
      const { request } = webhookUrl.startsWith('https')
        ? await import('https')
        : await import('http');

      await new Promise<void>((resolve, reject) => {
        const url = new URL(webhookUrl);
        const req = request(
          { hostname: url.hostname, port: url.port, path: url.pathname, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
          (res) => { res.resume(); res.on('end', resolve); },
        );
        req.on('error', reject);
        req.write(payload);
        req.end();
      });
    } catch (err) {
      logger.warn('Alert webhook dispatch failed', { url: webhookUrl, error: err });
    }
  }
}

export const alertingService = new AlertingService();
