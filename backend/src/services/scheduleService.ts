import { PrismaClient, ContributionSchedule, PaymentWindow } from '@prisma/client'
import { NotFoundError, ValidationError, ConflictError } from '../errors/AppError'
import { createModuleLogger } from '../utils/logger'
import type { CreateScheduleInput, UpdateScheduleInput } from '../validators/schedule'

const logger = createModuleLogger('ScheduleService')

// Lazy singleton prisma — avoids circular imports
let _prisma: PrismaClient | null = null
function getPrisma(): PrismaClient {
  if (!_prisma) _prisma = new PrismaClient()
  return _prisma
}

// ─── Date helpers (no external deps) ─────────────────────────────────────────

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000)
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

/**
 * Advance a date by one cycle according to the schedule frequency.
 * Uses calendar-accurate month arithmetic for MONTHLY.
 */
export function advanceDate(
  from: Date,
  frequency: string,
  customIntervalDays?: number | null
): Date {
  switch (frequency) {
    case 'WEEKLY':    return addDays(from, 7)
    case 'BI_WEEKLY': return addDays(from, 14)
    case 'MONTHLY': {
      const d = new Date(from)
      d.setMonth(d.getMonth() + 1)
      return d
    }
    case 'CUSTOM': {
      if (!customIntervalDays || customIntervalDays < 1) {
        throw new ValidationError('intervalDays is required for CUSTOM frequency')
      }
      return addDays(from, customIntervalDays)
    }
    default:
      throw new ValidationError(`Unknown frequency: ${frequency}`)
  }
}

/**
 * Compute the next due date that is strictly after `now`.
 */
export function computeNextDueDate(
  startDate: Date,
  frequency: string,
  customIntervalDays?: number | null,
  now: Date = new Date()
): Date {
  let candidate = new Date(startDate)
  while (candidate <= now) {
    candidate = advanceDate(candidate, frequency, customIntervalDays)
  }
  return candidate
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ScheduleService {
  private get prisma() { return getPrisma() }

  // ── Read ──────────────────────────────────────────────────────────────────

  async getSchedule(groupId: string): Promise<ContributionSchedule & { windows: PaymentWindow[] }> {
    const schedule = await this.prisma.contributionSchedule.findUnique({
      where: { groupId },
      include: { windows: { orderBy: { cycleNumber: 'desc' }, take: 10 } },
    })
    if (!schedule) throw new NotFoundError('ContributionSchedule', groupId)
    return schedule
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async createSchedule(
    groupId: string,
    input: CreateScheduleInput
  ): Promise<ContributionSchedule> {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } })
    if (!group) throw new NotFoundError('Group', groupId)

    const existing = await this.prisma.contributionSchedule.findUnique({ where: { groupId } })
    if (existing) {
      throw new ConflictError(
        `Group ${groupId} already has a contribution schedule. Use PATCH to modify it.`
      )
    }

    const startDate   = new Date(input.startDate)
    const nextDueDate = computeNextDueDate(startDate, input.frequency, input.intervalDays)

    const schedule = await this.prisma.contributionSchedule.create({
      data: {
        groupId,
        frequency:          input.frequency,
        intervalDays:       input.intervalDays ?? null,
        gracePeriodHours:   input.gracePeriodHours,
        paymentWindowHours: input.paymentWindowHours,
        startDate,
        nextDueDate,
        isActive: true,
      },
    })

    await this.openNextWindow(schedule)

    logger.info('Contribution schedule created', { groupId, frequency: input.frequency, nextDueDate })
    return schedule
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async updateSchedule(
    groupId: string,
    input: UpdateScheduleInput
  ): Promise<ContributionSchedule> {
    const existing = await this.prisma.contributionSchedule.findUnique({ where: { groupId } })
    if (!existing) throw new NotFoundError('ContributionSchedule', groupId)

    const frequency    = input.frequency    ?? existing.frequency
    const intervalDays = input.intervalDays ?? existing.intervalDays
    const startDate    = input.startDate ? new Date(input.startDate) : existing.startDate

    const scheduleChanged =
      input.frequency !== undefined ||
      input.intervalDays !== undefined ||
      input.startDate !== undefined

    const nextDueDate = scheduleChanged
      ? computeNextDueDate(startDate, frequency, intervalDays)
      : existing.nextDueDate

    const updated = await this.prisma.contributionSchedule.update({
      where: { groupId },
      data: {
        frequency,
        intervalDays:       intervalDays ?? null,
        gracePeriodHours:   input.gracePeriodHours   ?? existing.gracePeriodHours,
        paymentWindowHours: input.paymentWindowHours ?? existing.paymentWindowHours,
        startDate,
        nextDueDate,
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    })

    logger.info('Contribution schedule updated', { groupId, changes: input })
    return updated
  }

  // ── Payment Windows ───────────────────────────────────────────────────────

  /**
   * Open the next payment window for a schedule.
   */
  async openNextWindow(schedule: ContributionSchedule): Promise<PaymentWindow> {
    const lastWindow = await this.prisma.paymentWindow.findFirst({
      where: { scheduleId: schedule.id },
      orderBy: { cycleNumber: 'desc' },
    })

    const cycleNumber = (lastWindow?.cycleNumber ?? 0) + 1
    const opensAt     = new Date()
    const dueAt       = new Date(schedule.nextDueDate)
    const closesAt    = schedule.paymentWindowHours > 0
      ? addHours(dueAt, schedule.paymentWindowHours)
      : null

    const window = await this.prisma.paymentWindow.create({
      data: {
        scheduleId: schedule.id,
        cycleNumber,
        opensAt,
        dueAt,
        closesAt: closesAt ?? undefined,
        status: 'OPEN',
      },
    })

    logger.info('Payment window opened', {
      groupId: schedule.groupId,
      cycleNumber,
      dueAt,
      closesAt,
    })

    return window
  }

  /**
   * Close the current window and advance to the next cycle.
   */
  async advanceCycle(groupId: string): Promise<ContributionSchedule> {
    const schedule = await this.prisma.contributionSchedule.findUnique({ where: { groupId } })
    if (!schedule) throw new NotFoundError('ContributionSchedule', groupId)
    if (!schedule.isActive) return schedule

    await this.prisma.paymentWindow.updateMany({
      where: { scheduleId: schedule.id, status: { in: ['OPEN', 'GRACE'] } },
      data: { status: 'CLOSED', updatedAt: new Date() },
    })

    const newNextDueDate = advanceDate(schedule.nextDueDate, schedule.frequency, schedule.intervalDays)

    const updated = await this.prisma.contributionSchedule.update({
      where: { groupId },
      data: { nextDueDate: newNextDueDate },
    })

    await this.openNextWindow(updated)

    logger.info('Schedule cycle advanced', { groupId, newNextDueDate })
    return updated
  }

  // ── Grace Period Enforcement ──────────────────────────────────────────────

  /**
   * Check all active open/grace windows and transition their status.
   * Called by the cron job every 15 minutes.
   */
  async enforceGracePeriods(): Promise<{ graced: number; missed: number }> {
    const now = new Date()

    const openWindows = await this.prisma.paymentWindow.findMany({
      where: { status: { in: ['OPEN', 'GRACE'] } },
      include: { schedule: true },
    })

    let graced = 0
    let missed = 0

    for (const win of openWindows) {
      const { schedule } = win
      if (!schedule.isActive) continue

      const graceCutoff = addHours(win.dueAt, schedule.gracePeriodHours)
      const hardClose   = win.closesAt

      if (win.status === 'OPEN' && now > win.dueAt && now < graceCutoff) {
        // Entered grace period
        await this.prisma.paymentWindow.update({
          where: { id: win.id },
          data: { status: 'GRACE', updatedAt: now },
        })
        graced++
        logger.info('Window entered grace period', {
          windowId: win.id,
          groupId: schedule.groupId,
          cycleNumber: win.cycleNumber,
        })
      } else if (now >= graceCutoff || (hardClose && now >= hardClose)) {
        // Missed — mark and advance
        await this.prisma.paymentWindow.update({
          where: { id: win.id },
          data: { status: 'MISSED', updatedAt: now },
        })
        missed++
        logger.warn('Payment window missed', {
          windowId: win.id,
          groupId: schedule.groupId,
          cycleNumber: win.cycleNumber,
        })
        await this.advanceCycle(schedule.groupId)
      }
    }

    logger.info('Grace period enforcement complete', { graced, missed })
    return { graced, missed }
  }

  // ── Upcoming Due Dates ────────────────────────────────────────────────────

  /**
   * Return active schedules whose nextDueDate falls within `withinHours`.
   */
  async getUpcomingDue(withinHours = 24): Promise<ContributionSchedule[]> {
    const now    = new Date()
    const cutoff = addHours(now, withinHours)

    return this.prisma.contributionSchedule.findMany({
      where: {
        isActive: true,
        nextDueDate: { gte: now, lte: cutoff },
      },
      include: { group: true },
    })
  }
}

export const scheduleService = new ScheduleService()
