import { createQueue, getQueue } from './queueManager'

export const SCHEDULE_QUEUE_NAME = 'schedule'

export interface ScheduleJobData {
  type: 'enforce_grace_periods' | 'send_due_reminders'
}

export function getScheduleQueue() {
  return getQueue(SCHEDULE_QUEUE_NAME) || createQueue(SCHEDULE_QUEUE_NAME)
}

export async function addScheduleJob(data: ScheduleJobData): Promise<void> {
  const queue = getScheduleQueue()
  await queue.add(data.type, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  })
}
