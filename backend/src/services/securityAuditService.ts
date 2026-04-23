import { PrismaClient } from '@prisma/client'
import { createModuleLogger } from '../utils/logger'

const logger = createModuleLogger('SecurityAuditService')
const prisma = new PrismaClient()
const prismaAny = prisma as any

export type SecurityEventType =
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE'
  | 'AUTH_2FA_ENABLED'
  | 'AUTH_2FA_DISABLED'
  | 'PASSWORD_CHANGE'
  | 'ACCOUNT_LOCKED'
  | 'SUSPICIOUS_LOGIN'
  | 'PRIVILEGE_ESCALATION'
  | 'DATA_ACCESS'
  | 'DATA_EXPORT'
  | 'DATA_DELETION'
  | 'ADMIN_ACTION'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTRUSION_ATTEMPT'
  | 'CONSENT_CHANGE'
  | 'WALLET_CHANGE'

export type SecuritySeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface SecurityLogEntry {
  id: string
  eventType: SecurityEventType
  severity: SecuritySeverity
  userId?: string
  ipAddress?: string
  userAgent?: string
  resource?: string
  action?: string
  outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED'
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface IntrusionAlert {
  id: string
  alertType: string
  severity: SecuritySeverity
  ipAddress?: string
  userId?: string
  details: Record<string, unknown>
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED'
  createdAt: Date
}

// Thresholds for intrusion detection
const THRESHOLDS = {
  AUTH_FAILURES_PER_IP: 5,       // per 15 min
  AUTH_FAILURES_PER_USER: 3,     // per 15 min
  RATE_LIMIT_HITS: 10,           // per 5 min
  SUSPICIOUS_IPS_WINDOW_MS: 15 * 60 * 1000,
}

export class SecurityAuditService {
  // ─── Security Logging ─────────────────────────────────────────────────────

  async log(entry: Omit<SecurityLogEntry, 'id' | 'createdAt'>): Promise<SecurityLogEntry> {
    const record = await prismaAny.securityLog.create({
      data: {
        eventType: entry.eventType,
        severity: entry.severity,
        userId: entry.userId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        resource: entry.resource,
        action: entry.action,
        outcome: entry.outcome,
        metadata: JSON.stringify(entry.metadata),
      },
    })

    // Log to application logger as well
    const logFn = entry.severity === 'CRITICAL' ? logger.error.bind(logger)
      : entry.severity === 'WARNING' ? logger.warn.bind(logger)
      : logger.info.bind(logger)

    logFn(`[SECURITY] ${entry.eventType}`, {
      userId: entry.userId,
      ip: entry.ipAddress,
      outcome: entry.outcome,
    })

    // Run intrusion detection after logging
    await this.runIntrusionDetection(entry).catch(() => {})

    return this.mapLog(record)
  }

  async getLogs(params: {
    eventType?: SecurityEventType
    severity?: SecuritySeverity
    userId?: string
    ipAddress?: string
    outcome?: string
    startDate?: Date
    endDate?: Date
    page?: number
    limit?: number
  }): Promise<{ logs: SecurityLogEntry[]; total: number }> {
    const { page = 1, limit = 50 } = params
    const where: Record<string, unknown> = {}

    if (params.eventType) where.eventType = params.eventType
    if (params.severity) where.severity = params.severity
    if (params.userId) where.userId = params.userId
    if (params.ipAddress) where.ipAddress = params.ipAddress
    if (params.outcome) where.outcome = params.outcome
    if (params.startDate || params.endDate) {
      where.createdAt = {
        ...(params.startDate ? { gte: params.startDate } : {}),
        ...(params.endDate ? { lte: params.endDate } : {}),
      }
    }

    const [raw, total] = await Promise.all([
      prismaAny.securityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prismaAny.securityLog.count({ where }),
    ])

    return { logs: (raw ?? []).map(this.mapLog), total: total ?? 0 }
  }

  // ─── Log Analysis ─────────────────────────────────────────────────────────

  async analyzeSecurityTrends(windowHours = 24): Promise<{
    totalEvents: number
    criticalEvents: number
    topEventTypes: Array<{ eventType: string; count: number }>
    topSuspiciousIPs: Array<{ ipAddress: string; failureCount: number }>
    failureRate: number
  }> {
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000)

    const [total, critical, byType, failures, successes] = await Promise.all([
      prismaAny.securityLog.count({ where: { createdAt: { gte: since } } }),
      prismaAny.securityLog.count({ where: { createdAt: { gte: since }, severity: 'CRITICAL' } }),
      prismaAny.securityLog.groupBy({
        by: ['eventType'],
        where: { createdAt: { gte: since } },
        _count: { eventType: true },
        orderBy: { _count: { eventType: 'desc' } },
        take: 10,
      }),
      prismaAny.securityLog.count({ where: { createdAt: { gte: since }, outcome: 'FAILURE' } }),
      prismaAny.securityLog.count({ where: { createdAt: { gte: since }, outcome: 'SUCCESS' } }),
    ])

    // Top suspicious IPs (most auth failures)
    const ipFailures = await prismaAny.securityLog.groupBy({
      by: ['ipAddress'],
      where: {
        createdAt: { gte: since },
        outcome: 'FAILURE',
        eventType: { in: ['AUTH_FAILURE', 'INTRUSION_ATTEMPT'] },
        ipAddress: { not: null },
      },
      _count: { ipAddress: true },
      orderBy: { _count: { ipAddress: 'desc' } },
      take: 10,
    })

    return {
      totalEvents: total ?? 0,
      criticalEvents: critical ?? 0,
      topEventTypes: (byType ?? []).map((r: any) => ({
        eventType: r.eventType,
        count: r._count.eventType,
      })),
      topSuspiciousIPs: (ipFailures ?? []).map((r: any) => ({
        ipAddress: r.ipAddress,
        failureCount: r._count.ipAddress,
      })),
      failureRate: (total ?? 0) > 0 ? ((failures ?? 0) / (total ?? 1)) * 100 : 0,
    }
  }

  // ─── Intrusion Detection ──────────────────────────────────────────────────

  private async runIntrusionDetection(entry: Omit<SecurityLogEntry, 'id' | 'createdAt'>): Promise<void> {
    const since = new Date(Date.now() - THRESHOLDS.SUSPICIOUS_IPS_WINDOW_MS)

    // Detect brute-force by IP
    if (entry.eventType === 'AUTH_FAILURE' && entry.ipAddress) {
      const count = await prismaAny.securityLog.count({
        where: { ipAddress: entry.ipAddress, eventType: 'AUTH_FAILURE', createdAt: { gte: since } },
      })
      if (count >= THRESHOLDS.AUTH_FAILURES_PER_IP) {
        await this.createIntrusionAlert('BRUTE_FORCE_IP', 'CRITICAL', {
          ipAddress: entry.ipAddress,
          failureCount: count,
          window: '15min',
        })
      }
    }

    // Detect brute-force by user
    if (entry.eventType === 'AUTH_FAILURE' && entry.userId) {
      const count = await prismaAny.securityLog.count({
        where: { userId: entry.userId, eventType: 'AUTH_FAILURE', createdAt: { gte: since } },
      })
      if (count >= THRESHOLDS.AUTH_FAILURES_PER_USER) {
        await this.createIntrusionAlert('BRUTE_FORCE_USER', 'CRITICAL', {
          userId: entry.userId,
          failureCount: count,
          window: '15min',
        })
      }
    }

    // Detect rate limit abuse
    if (entry.eventType === 'RATE_LIMIT_EXCEEDED' && entry.ipAddress) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
      const count = await prismaAny.securityLog.count({
        where: { ipAddress: entry.ipAddress, eventType: 'RATE_LIMIT_EXCEEDED', createdAt: { gte: fiveMinAgo } },
      })
      if (count >= THRESHOLDS.RATE_LIMIT_HITS) {
        await this.createIntrusionAlert('RATE_LIMIT_ABUSE', 'WARNING', {
          ipAddress: entry.ipAddress,
          hitCount: count,
          window: '5min',
        })
      }
    }
  }

  async createIntrusionAlert(
    alertType: string,
    severity: SecuritySeverity,
    details: Record<string, unknown>
  ): Promise<IntrusionAlert> {
    // Deduplicate: don't create duplicate open alerts for same type+IP within 1h
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const existing = await prismaAny.intrusionAlert.findFirst({
      where: {
        alertType,
        status: { in: ['OPEN', 'INVESTIGATING'] },
        createdAt: { gte: oneHourAgo },
        ...(details.ipAddress ? { ipAddress: details.ipAddress } : {}),
        ...(details.userId ? { userId: details.userId } : {}),
      },
    })
    if (existing) return this.mapAlert(existing)

    const alert = await prismaAny.intrusionAlert.create({
      data: {
        alertType,
        severity,
        ipAddress: details.ipAddress as string | undefined,
        userId: details.userId as string | undefined,
        details: JSON.stringify(details),
        status: 'OPEN',
      },
    })

    logger.error(`[INTRUSION ALERT] ${alertType}`, { severity, details })
    return this.mapAlert(alert)
  }

  async listIntrusionAlerts(params: {
    status?: string
    severity?: SecuritySeverity
    page?: number
    limit?: number
  }): Promise<{ alerts: IntrusionAlert[]; total: number }> {
    const { page = 1, limit = 20 } = params
    const where: Record<string, unknown> = {}
    if (params.status) where.status = params.status
    if (params.severity) where.severity = params.severity

    const [raw, total] = await Promise.all([
      prismaAny.intrusionAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prismaAny.intrusionAlert.count({ where }),
    ])

    return { alerts: (raw ?? []).map(this.mapAlert), total: total ?? 0 }
  }

  async updateIntrusionAlertStatus(
    alertId: string,
    status: 'INVESTIGATING' | 'RESOLVED'
  ): Promise<IntrusionAlert> {
    const alert = await prismaAny.intrusionAlert.update({
      where: { id: alertId },
      data: { status },
    })
    return this.mapAlert(alert)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private mapLog(raw: any): SecurityLogEntry {
    return {
      id: raw.id,
      eventType: raw.eventType,
      severity: raw.severity,
      userId: raw.userId ?? undefined,
      ipAddress: raw.ipAddress ?? undefined,
      userAgent: raw.userAgent ?? undefined,
      resource: raw.resource ?? undefined,
      action: raw.action ?? undefined,
      outcome: raw.outcome,
      metadata: typeof raw.metadata === 'string' ? JSON.parse(raw.metadata) : raw.metadata ?? {},
      createdAt: raw.createdAt,
    }
  }

  private mapAlert(raw: any): IntrusionAlert {
    return {
      id: raw.id,
      alertType: raw.alertType,
      severity: raw.severity,
      ipAddress: raw.ipAddress ?? undefined,
      userId: raw.userId ?? undefined,
      details: typeof raw.details === 'string' ? JSON.parse(raw.details) : raw.details ?? {},
      status: raw.status,
      createdAt: raw.createdAt,
    }
  }
}

export const securityAuditService = new SecurityAuditService()
