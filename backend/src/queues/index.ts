// Re-export all queue-related modules
export * from './queueManager'
export * from './emailQueue'
export * from './payoutQueue'
export * from './syncQueue'
export * from './notificationQueue'
export * from './scheduleQueue'

// Import queue creators for initialization
import { createQueue } from './queueManager'
import { EMAIL_QUEUE_NAME } from './emailQueue'
import { PAYOUT_QUEUE_NAME } from './payoutQueue'
import { SYNC_QUEUE_NAME } from './syncQueue'
import { NOTIFICATION_QUEUE_NAME } from './notificationQueue'
import { REMINDER_QUEUE_NAME } from '../jobs/workers'
import { SCHEDULE_QUEUE_NAME } from './scheduleQueue'

/**
 * Initialize all queues
 * Call this during application startup
 */
export function initializeQueues() {
  createQueue(EMAIL_QUEUE_NAME)
  createQueue(PAYOUT_QUEUE_NAME)
  createQueue(SYNC_QUEUE_NAME)
  createQueue(NOTIFICATION_QUEUE_NAME)
  createQueue(REMINDER_QUEUE_NAME)
  createQueue(SCHEDULE_QUEUE_NAME)
}

// Export queue names for reference
export const QUEUE_NAMES = {
  EMAIL: EMAIL_QUEUE_NAME,
  PAYOUT: PAYOUT_QUEUE_NAME,
  SYNC: SYNC_QUEUE_NAME,
  NOTIFICATION: NOTIFICATION_QUEUE_NAME,
  REMINDER: REMINDER_QUEUE_NAME,
  SCHEDULE: SCHEDULE_QUEUE_NAME,
} as const
