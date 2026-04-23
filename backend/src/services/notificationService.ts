/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { emailService } from './emailService'
import webpush from 'web-push'

export type NotificationType =
  | 'contribution_due'
  | 'contribution_overdue'
  | 'contribution_received'
  | 'payout_received'
  | 'member_joined'
  | 'member_left'
  | 'cycle_completed'
  | 'group_created'
  | 'announcement'

export interface NotificationPayload {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: number
  groupId?: string
  actionUrl?: string
  metadata?: Record<string, unknown>
}

// In-memory offline queue: userId -> queued notifications
const offlineQueue = new Map<string, NotificationPayload[]>()

class NotificationService {
  // Using any to avoid socket.io version resolution issues at IDE level.
  // At runtime the correct backend socket.io (^4.x) is used.
  private io: any = null
  // userId -> Set of socketIds on the /notifications namespace
  private userSockets = new Map<string, Set<string>>()

  /**
   * Initializes the notification service and sets up the /notifications socket namespace.
   * Handles authentication middleware and connection lifecycle.
   * 
   * @param io - The Socket.IO server instance
   */
  init(io: any) {
    this.io = io
    const ns = io.of('/notifications')

    ns.use(async (socket: any, next: (err?: Error) => void) => {
      try {
        const walletAddress = socket.handshake.auth.walletAddress
        const userId = socket.handshake.auth.userId

        if (!walletAddress || !userId) {
          return next(new Error('Authentication required'))
        }

        const user = await prisma.user.findUnique({ where: { walletAddress } })
        if (!user) return next(new Error('User not found'))

        socket.data = { userId, walletAddress }
        next()
      } catch (err) {
        logger.error('Notification socket auth error:', err)
        next(new Error('Authentication failed'))
      }
    })

    ns.on('connection', (socket: any) => {
      const socketData = socket.data as { userId: string; walletAddress: string }
      const userId = socketData.userId
      logger.info(`Notification socket connected: ${userId}`)

      // Track socket
      if (!this.userSockets.has(userId)) this.userSockets.set(userId, new Set())
      this.userSockets.get(userId)!.add(socket.id)

      // Flush offline queue
      const queued = offlineQueue.get(userId)
      if (queued?.length) {
        queued.forEach((n) => socket.emit('notification', n))
        offlineQueue.delete(userId)
        logger.info(`Flushed ${queued.length} queued notifications to ${userId}`)
      }

      // Client can mark notifications read via socket
      socket.on('mark_read', (data: { notificationId: string }) => {
        logger.info(`User ${userId} marked notification ${data.notificationId} as read`)
      })

      socket.on('disconnect', () => {
        const sockets = this.userSockets.get(userId)
        if (sockets) {
          sockets.delete(socket.id)
          if (sockets.size === 0) this.userSockets.delete(userId)
        }
        logger.info(`Notification socket disconnected: ${userId}`)
      })
    })

    logger.info('Notification namespace /notifications initialized')
  }

  /**
   * Sends a targeted notification to a specific user.
   * If the user is currently offline (no active sockets), the notification is queued
   * and will be delivered upon their next connection.
   * Also sends an email for high-priority event types when the user has an email on file.
   *
   * @param userId - The ID of the recipient user
   * @param payload - The notification content (type, title, message, etc.)
   * @returns The created notification object with ID and timestamp
   */
  sendToUser(userId: string, payload: Omit<NotificationPayload, 'id' | 'timestamp'>) {
    const notification: NotificationPayload = {
      ...payload,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    }

    const ns = this.io?.of('/notifications')
    const sockets = this.userSockets.get(userId)

    if (ns && sockets?.size) {
      sockets.forEach((socketId: string) => {
        ns.to(socketId).emit('notification', notification)
      })
      logger.info(`Notification sent to user ${userId}: ${notification.type}`)
    } else {
      // Queue for when user reconnects
      if (!offlineQueue.has(userId)) offlineQueue.set(userId, [])
      const queue = offlineQueue.get(userId)!
      queue.push(notification)
      // Cap queue at 50 per user
      if (queue.length > 50) queue.shift()
      logger.info(`Notification queued for offline user ${userId}: ${notification.type}`)
    }

    // Send email for high-priority events
    this.sendEmailForEvent(userId, notification).catch((err) =>
      logger.error('Email notification error', { err, userId, type: notification.type })
    )

    // Send Web Push notification
    this.sendPushForEvent(userId, notification).catch((err) =>
      logger.error('Push notification error', { err, userId, type: notification.type })
    )

    return notification
  }

  private async sendPushForEvent(userId: string, notification: NotificationPayload): Promise<void> {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return

    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } })
    if (!subscriptions.length) return

    const payload = JSON.stringify({ title: notification.title, body: notification.message, tag: notification.id })

    await Promise.allSettled(
      subscriptions.map((sub: { endpoint: string; p256dh: string; auth: string; id: string }) =>
        webpush
          .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
          .catch(async (err: any) => {
            // 410 Gone = subscription expired, clean it up
            if (err.statusCode === 410) {
              await prisma.pushSubscription.delete({ where: { id: sub.id } })
            }
          })
      )
    )
  }

  private async sendEmailForEvent(userId: string, notification: NotificationPayload): Promise<void> {
    const EMAIL_TYPES: NotificationType[] = ['contribution_received', 'payout_received', 'contribution_due', 'contribution_overdue']
    if (!EMAIL_TYPES.includes(notification.type)) return

    const user = await prisma.user.findUnique({ where: { walletAddress: userId }, select: { email: true, name: true } })
    if (!user?.email) return

    const name = user.name ?? userId
    const groupId = notification.groupId ?? ''

    if (notification.type === 'payout_received') {
      const amountMatch = notification.message.match(/[\d,]+/)
      await emailService.sendPayoutNotification(
        user.email,
        notification.metadata?.groupName as string ?? groupId,
        amountMatch?.[0] ?? '0',
        notification.metadata?.txHash as string ?? '',
        notification.metadata?.cycleNumber as number ?? 0,
        new Date().toLocaleDateString()
      )
    } else if (notification.type === 'contribution_received') {
      await emailService.sendTransactionReceipt(user.email, {
        groupName: notification.metadata?.groupName as string ?? groupId,
        amount: notification.metadata?.amount as string ?? '0',
        txHash: notification.metadata?.txHash as string ?? '',
        date: new Date().toLocaleDateString(),
        cycleNumber: notification.metadata?.cycleNumber as number ?? 0,
      })
    } else if (notification.type === 'contribution_due' || notification.type === 'contribution_overdue') {
      const hoursMatch = notification.message.match(/\d+/)
      await emailService.sendContributionReminder(
        user.email,
        notification.metadata?.groupName as string ?? groupId,
        notification.metadata?.amount as string ?? '0',
        notification.metadata?.dueDate as string ?? new Date().toLocaleDateString(),
        notification.metadata?.cycleNumber as number ?? 0,
        groupId
      )
    }
  }

  /**
   * Broadcasts a notification to all members of a specific savings group.
   * 
   * @param groupId - The ID of the target group
   * @param payload - The notification content
   * @param excludeUserId - Optional user ID to exclude from the broadcast (e.g., the actor)
   */
  async sendToGroup(
    groupId: string,
    payload: Omit<NotificationPayload, 'id' | 'timestamp'>,
    excludeUserId?: string
  ) {
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    })

    members.forEach((member: { userId: string }) => {
      if (member.userId !== excludeUserId) {
        this.sendToUser(member.userId, { ...payload, groupId })
      }
    })
  }

  /**
   * Broadcasts a notification to ALL currently connected users globally.
   * Useful for system-wide announcements or maintenance windows.
   * 
   * @param payload - The notification content
   */
  broadcast(payload: Omit<NotificationPayload, 'id' | 'timestamp'>) {
    const notification: NotificationPayload = {
      ...payload,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    }
    this.io?.of('/notifications').emit('notification', notification)
    logger.info(`Broadcast notification: ${notification.type}`)
  }

  isUserOnline(userId: string): boolean {
    return (this.userSockets.get(userId)?.size ?? 0) > 0
  }
}

export const notificationService = new NotificationService()
