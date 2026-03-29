'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import type { StreakMilestoneData } from '@/hooks/useStreak'

interface StreakMilestoneProps {
  milestone: StreakMilestoneData
  currentStreak: number
  index: number
}

const MILESTONE_ICONS: Record<number, string> = {
  3: '🌱',
  7: '🔥',
  14: '⚡',
  30: '🏆',
  60: '💎',
  90: '👑',
}

export function StreakMilestone({ milestone, currentStreak, index }: StreakMilestoneProps) {
  const progress = Math.min(100, (currentStreak / milestone.days) * 100)
  const isNext = !milestone.reached && currentStreak < milestone.days
  const daysLeft = milestone.days - currentStreak

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      className={clsx(
        'relative overflow-hidden rounded-2xl border p-4 transition-shadow',
        milestone.reached
          ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm'
          : isNext
            ? 'border-primary-200 bg-gradient-to-br from-primary-50 to-indigo-50'
            : 'border-surface-200 bg-surface-50/70',
      )}
      aria-label={`Milestone: ${milestone.label}, ${milestone.reached ? 'reached' : `${daysLeft} days remaining`}`}
    >
      {/* Celebration shimmer for reached milestones */}
      {milestone.reached && (
        <motion.div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 1.2, delay: index * 0.1 + 0.4, ease: 'easeInOut' }}
        />
      )}

      <div className="flex items-start gap-3">
        <div
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl',
            milestone.reached
              ? 'bg-amber-100'
              : isNext
                ? 'bg-primary-100'
                : 'bg-surface-200',
          )}
          aria-hidden="true"
        >
          {MILESTONE_ICONS[milestone.days] ?? '🎯'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p
              className={clsx(
                'text-sm font-semibold',
                milestone.reached ? 'text-amber-800' : 'text-surface-800',
              )}
            >
              {milestone.label}
            </p>
            <span
              className={clsx(
                'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                milestone.reached
                  ? 'bg-amber-200 text-amber-800'
                  : isNext
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-surface-200 text-surface-500',
              )}
            >
              {milestone.days}d
            </span>
          </div>

          {!milestone.reached && (
            <div className="mt-2">
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200"
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${Math.round(progress)}% progress toward ${milestone.label}`}
              >
                <motion.div
                  className={clsx(
                    'h-full rounded-full',
                    isNext ? 'bg-primary-500' : 'bg-surface-400',
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, delay: index * 0.07 + 0.2, ease: 'easeOut' }}
                />
              </div>
              <p className="mt-1 text-xs text-surface-500">
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} to go
              </p>
            </div>
          )}

          {milestone.reached && (
            <p className="mt-1 text-xs font-medium text-amber-600">
              ✓ Achieved
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

interface StreakMilestoneCelebrationProps {
  milestone: StreakMilestoneData
  onDismiss: () => void
}

/** Full-screen celebration overlay when a new milestone is hit */
export function StreakMilestoneCelebration({
  milestone,
  onDismiss,
}: StreakMilestoneCelebrationProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label={`Milestone celebration: ${milestone.label}`}
    >
      <motion.div
        className="relative mx-4 max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 p-8 text-center text-white shadow-2xl"
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.7, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <motion.div
          className="mb-4 text-6xl"
          animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, delay: 0.2 }}
          aria-hidden="true"
        >
          {MILESTONE_ICONS[milestone.days] ?? '🎯'}
        </motion.div>

        <h2 className="text-2xl font-bold">Milestone Reached!</h2>
        <p className="mt-2 text-lg font-semibold text-amber-100">{milestone.label}</p>
        <p className="mt-3 text-sm text-amber-100">
          You've maintained a {milestone.days}-day contribution streak. Keep it up!
        </p>

        <button
          onClick={onDismiss}
          className="mt-6 w-full rounded-2xl bg-white/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          Keep Going 🚀
        </button>
      </motion.div>
    </motion.div>
  )
}
