import { Request, Response, NextFunction } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { scheduleService } from '../services/scheduleService'
import type { CreateScheduleInput, UpdateScheduleInput } from '../validators/schedule'

export class ScheduleController {
  /**
   * GET /api/groups/:id/schedule
   * Returns the contribution schedule (with last 10 payment windows).
   */
  getSchedule = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const schedule = await scheduleService.getSchedule(req.params.id)
    res.json({ success: true, data: schedule })
  })

  /**
   * POST /api/groups/:id/schedule
   * Create a new contribution schedule for the group.
   */
  createSchedule = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const input = req.body as CreateScheduleInput
    const schedule = await scheduleService.createSchedule(req.params.id, input)
    res.status(201).json({ success: true, data: schedule })
  })

  /**
   * PATCH /api/groups/:id/schedule
   * Modify an existing schedule (frequency, grace period, window, etc.).
   */
  updateSchedule = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const input = req.body as UpdateScheduleInput
    const schedule = await scheduleService.updateSchedule(req.params.id, input)
    res.json({ success: true, data: schedule })
  })

  /**
   * POST /api/groups/:id/schedule/advance
   * Manually advance the schedule to the next cycle (admin use).
   */
  advanceCycle = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const schedule = await scheduleService.advanceCycle(req.params.id)
    res.json({ success: true, data: schedule })
  })
}
