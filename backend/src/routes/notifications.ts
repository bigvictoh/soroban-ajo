import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { notificationService } from '../services/notificationService'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import webpush from 'web-push'

export const notificationsRouter = Router()

// Configure VAPID keys if provided
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.EMAIL_FROM || 'noreply@ajo.app'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

// All routes require authentication
notificationsRouter.use(authMiddleware)

/**
 * GET /api/notifications
 * Returns recent activity-feed entries as notification history.
 */
notificationsRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.walletAddress!
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    const offset = Number(req.query.offset) || 0

    const activities = await prisma.activityFeed.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    res.json({
      success: true,
      data: activities.map((a: any) => ({
        id: a.id,
        type: a.type.toLowerCase(),
        title: a.title,
        message: a.description,
        timestamp: a.createdAt.getTime(),
        read: false, // read state is managed client-side
        metadata: a.metadata ? JSON.parse(a.metadata as string) : null,
      })),
    })
  } catch (err) {
    logger.error('Error fetching notifications:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' })
  }
})

/**
 * POST /api/notifications/test
 * Sends a test notification to the authenticated user (dev/debug only).
 */
notificationsRouter.post('/test', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.walletAddress!
    const notification = notificationService.sendToUser(userId, {
      type: 'announcement',
      title: 'Test Notification',
      message: 'Real-time notifications are working correctly.',
    })

    res.json({ success: true, data: notification })
  } catch (err) {
    logger.error('Error sending test notification:', err)
    res.status(500).json({ success: false, error: 'Failed to send notification' })
  }
})

/**
 * GET /api/notifications/status
 * Returns whether the authenticated user is currently connected via WebSocket.
 */
notificationsRouter.get('/status', (req: AuthRequest, res: Response) => {
  const userId = req.user!.walletAddress!
  res.json({
    success: true,
    data: { online: notificationService.isUserOnline(userId) },
  })
})

/**
 * POST /api/notifications/push/subscribe
 * Saves a Web Push subscription for the authenticated user.
 */
notificationsRouter.post('/push/subscribe', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.walletAddress!
    const subscription = req.body as { endpoint: string; keys: { p256dh: string; auth: string } }

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ success: false, error: 'Invalid push subscription' })
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: { userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    })

    res.json({ success: true })
  } catch (err) {
    logger.error('Error saving push subscription:', err)
    res.status(500).json({ success: false, error: 'Failed to save subscription' })
  }
})

/**
 * DELETE /api/notifications/push/subscribe
 * Removes a Web Push subscription for the authenticated user.
 */
notificationsRouter.delete('/push/subscribe', async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint } = req.body as { endpoint: string }
    if (!endpoint) return res.status(400).json({ success: false, error: 'endpoint required' })

    await prisma.pushSubscription.deleteMany({ where: { endpoint } })
    res.json({ success: true })
  } catch (err) {
    logger.error('Error removing push subscription:', err)
    res.status(500).json({ success: false, error: 'Failed to remove subscription' })
  }
})
