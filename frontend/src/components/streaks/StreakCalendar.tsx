'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth } from 'date-fns'
import type { StreakDay } from '@/hooks/useStreak'

interface StreakCalendarProps {
  history: StreakDay[]
  /** Month to display, defaults to current month */
  month?: Date
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function StreakCalendar({ history, month }: StreakCalendarProps) {
  const [activeMonth, setActiveMonth] = useState<Date>(month ?? new Date())

  const historyMap = useMemo(() => {
    const map = new Map<string, StreakDay>()
    for (const day of history) {
      map.set(day.date, day)
    }
    return map
  }, [history])

  const calendarDays = useMemo(() => {
    const start = startOfMonth(activeMonth)
    const end = endOfMonth(activeMonth)
    const days = eachDayOfInterval({ start, end })
    // Pad start with empty slots for correct weekday alignment
    const startPad = getDay(start)
    return { days, startPad }
  }, [activeMonth])

  function prevMonth() {
    setActiveMonth((m: Date) => {
      const d = new Date(m)
      d.setMonth(d.getMonth() - 1)
      return d
    })
  }

  function nextMonth() {
    setActiveMonth((m: Date) => {
      const d = new Date(m)
      d.setMonth(d.getMonth() + 1)
      return d
    })
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded-xl p-2 text-surface-500 transition-colors hover:bg-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
          aria-label="Previous month"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h3 className="text-sm font-semibold text-surface-800">
          {format(activeMonth, 'MMMM yyyy')}
        </h3>

        <button
          onClick={nextMonth}
          className="rounded-xl p-2 text-surface-500 transition-colors hover:bg-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
          aria-label="Next month"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="mb-2 grid grid-cols-7 gap-1" role="row">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-semibold uppercase tracking-wide text-surface-400"
            aria-label={label}
          >
            {label.slice(0, 1)}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="grid grid-cols-7 gap-1"
        role="grid"
        aria-label={`Contribution calendar for ${format(activeMonth, 'MMMM yyyy')}`}
      >
        {/* Empty padding cells */}
        {Array.from({ length: calendarDays.startPad }).map((_, i) => (
          <div key={`pad-${i}`} role="gridcell" aria-hidden="true" />
        ))}

        {calendarDays.days.map((day: Date, i: number) => {
          const dateStr = day.toISOString().split('T')[0]
          const streakDay = historyMap.get(dateStr)
          const isToday = dateStr === today
          const inCurrentMonth = isSameMonth(day, activeMonth)
          const isFuture = dateStr > today

          return (
            <motion.div
              key={dateStr}
              role="gridcell"
              aria-label={`${format(day, 'MMMM d')}: ${
                isFuture
                  ? 'upcoming'
                  : streakDay?.contributed
                    ? 'contributed on time'
                    : 'missed'
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.008, duration: 0.2 }}
              className={clsx(
                'relative flex aspect-square items-center justify-center rounded-lg text-xs font-medium transition-transform hover:scale-110',
                !inCurrentMonth && 'opacity-30',
                isFuture && 'cursor-default text-surface-300',
                !isFuture && streakDay?.contributed && 'bg-success-500 text-white shadow-sm',
                !isFuture && !streakDay?.contributed && 'bg-surface-100 text-surface-400',
                isToday && 'ring-2 ring-primary-400 ring-offset-1',
              )}
            >
              {format(day, 'd')}
              {isToday && (
                <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary-500" aria-hidden="true" />
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-surface-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-success-500" aria-hidden="true" />
          Contributed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-surface-100" aria-hidden="true" />
          Missed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded ring-2 ring-primary-400" aria-hidden="true" />
          Today
        </span>
      </div>
    </div>
  )
}
