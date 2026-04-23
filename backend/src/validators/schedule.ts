import { z } from 'zod'

export const ScheduleFrequency = z.enum(['WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'CUSTOM'])
export type ScheduleFrequencyType = z.infer<typeof ScheduleFrequency>

// POST /api/groups/:id/schedule  — create or replace a schedule
export const createScheduleSchema = z
  .object({
    frequency: ScheduleFrequency,
    intervalDays: z
      .number()
      .int()
      .min(1, 'intervalDays must be at least 1')
      .optional(),
    gracePeriodHours: z
      .number()
      .int()
      .min(0)
      .max(168, 'Grace period cannot exceed 7 days')
      .default(24),
    paymentWindowHours: z
      .number()
      .int()
      .min(0)
      .max(720, 'Payment window cannot exceed 30 days')
      .default(72),
    startDate: z
      .string()
      .datetime({ message: 'startDate must be a valid ISO-8601 datetime' }),
  })
  .refine(
    (data) => data.frequency !== 'CUSTOM' || (data.intervalDays !== undefined && data.intervalDays > 0),
    { message: 'intervalDays is required when frequency is CUSTOM', path: ['intervalDays'] }
  )

// PATCH /api/groups/:id/schedule  — partial update
export const updateScheduleSchema = z
  .object({
    frequency: ScheduleFrequency.optional(),
    intervalDays: z.number().int().min(1).optional(),
    gracePeriodHours: z.number().int().min(0).max(168).optional(),
    paymentWindowHours: z.number().int().min(0).max(720).optional(),
    startDate: z.string().datetime().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.frequency !== 'CUSTOM' ||
      data.intervalDays !== undefined,
    { message: 'intervalDays is required when changing frequency to CUSTOM', path: ['intervalDays'] }
  )

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>
