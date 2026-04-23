import { Job } from 'bullmq'
import { scheduleService } from '../services/scheduleService'
import { logger } from '../utils/logger'
import type { ScheduleJobData } from '../queues/scheduleQueue'

export async function processScheduleJob(job: Job<ScheduleJobData>): Promise<void> {
  logger.info('Processing schedule job', { jobId: job.id, type: job.data.type })

  try {
    switch (job.data.type) {
      case 'enforce_grace_periods': {
        const result = await scheduleService.enforceGracePeriods()
        logger.info('Grace period enforcement done', { jobId: job.id, ...result })
        break
      }

      case 'send_due_reminders': {
        // Fetch schedules due within the next 24 hours and log them.
        // Wire up to your notificationService / emailService as needed.
        const upcoming = await scheduleService.getUpcomingDue(24)
        logger.info('Upcoming contribution reminders', {
          jobId: job.id,
          count: upcoming.length,
          groups: upcoming.map((s) => s.groupId),
        })
        break
      }

      default:
        logger.warn('Unknown schedule job type', { type: (job.data as any).type })
    }
  } catch (error) {
    logger.error('Schedule job failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error // trigger BullMQ retry
  }
}
