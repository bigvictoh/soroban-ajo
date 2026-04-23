import { Request, Response, NextFunction } from 'express'
import { securityAuditService, SecurityEventType } from '../services/securityAuditService'

/**
 * Middleware that automatically logs security-relevant events.
 * Attach to sensitive routes (auth, admin, exports, etc.)
 */
export function securityAudit(eventType: SecurityEventType, resource?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res)

    res.json = function (body: any) {
      const outcome = res.statusCode < 400 ? 'SUCCESS' : res.statusCode === 403 ? 'BLOCKED' : 'FAILURE'
      const severity =
        eventType.includes('FAILURE') || eventType === 'INTRUSION_ATTEMPT' ? 'WARNING'
        : eventType === 'ADMIN_ACTION' || eventType === 'PRIVILEGE_ESCALATION' ? 'WARNING'
        : 'INFO'

      securityAuditService
        .log({
          eventType,
          severity,
          userId: (req as any).user?.walletAddress ?? (req as any).admin?.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          resource: resource ?? req.path,
          action: req.method,
          outcome,
          metadata: { statusCode: res.statusCode, path: req.path },
        })
        .catch(() => {}) // non-blocking

      return originalJson(body)
    }

    next()
  }
}
