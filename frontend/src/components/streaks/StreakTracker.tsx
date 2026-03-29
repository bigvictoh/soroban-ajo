'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import { useStreak } from '@/hooks/useStreak'
import { StreakCalendar } from './StreakCalendar'
import { StreakMilestone, StreakMilestoneCelebration } from './StreakMilestone'
import type { StreakMilestoneData } from '@/hooks/useStreak'

interface StreakTrackerProps {
  walletAddress?: string
  authenticated?: boolean
  className?: string
}

export function StreakTracker({
  walletAddress,
  authenticated = false,
  className,
}: StreakTrackerProps) {
  const {
    loading,
    error,
    currentStreak,
    longestStreak,
    totalContributions,
    history,
    milestones,
    refresh,
  } = useStreak({ address: walletAddress, authenticated })

  const [celebrationMilestone, setCelebrationMilestone] = useState<StreakMilestoneData | null>(null)
  const [dismissedMilestones, setDismissedMilestones] = useState<Set<number>>(new Set())

  // Trigger celebration for newly reached milestones
  useEffect(() => {
    if (loading || !milestones.length) return
    const newlyReached = milestones.find(
      (m: StreakMilestoneData) => m.reached && !dismissedMilestones.has(m.days),
    )
    if (newlyReached) {
      setCelebrationMilestone(newlyReached)
    }
  }, [milestones, loading, dismissedMilestones])

  function dismissCelebration() {
    if (celebrationMilestone) {
      setDismissedMilestones((prev: Set<number>) => new Set(prev).add(celebrationMilestone.days))
      setCelebrationMilestone(null)
    }
  }

  if (loading) {
    return <StreakTrackerSkeleton className={className} />
  }

  return (
    <>
      <AnimatePresence>
        {celebrationMilestone && (
          <StreakMilestoneCelebration
            milestone={celebrationMilestone}
            onDismiss={dismissCelebration}
          />
        )}
      </AnimatePresence>

      <div className={clsx('space-y-6', className)}>
        {/* Header stats */}
        <motion.section
          className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_40%),linear-gradient(135deg,_#0f172a,_#4f46e5_55%,_#7c3aed)] p-6 text-white shadow-xl"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          aria-label="Streak overview"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-200">
            Contribution Streak
          </p>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <motion.span
                  className="text-6xl font-bold tabular-nums"
                  key={currentStreak}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {currentStreak}
                </motion.span>
                <span className="text-xl text-indigo-200">
                  {currentStreak === 1 ? 'day' : 'days'}
                </span>
              </div>
              <p className="mt-1 text-sm text-indigo-200">current streak</p>
            </div>

            {/* Flame indicator */}
            <StreakFlame streak={currentStreak} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatPill label="Longest Streak" value={`${longestStreak}d`} />
            <StatPill label="Total Contributions" value={String(totalContributions)} />
          </div>

          {error && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-white/10 px-4 py-2 text-xs text-indigo-100">
              <span>Using cached data</span>
              <button
                onClick={refresh}
                className="font-semibold underline underline-offset-2 hover:text-white focus:outline-none"
              >
                Retry
              </button>
            </div>
          )}
        </motion.section>

        {/* Calendar */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          aria-label="Contribution calendar"
        >
          <SectionHeading>Activity Calendar</SectionHeading>
          <StreakCalendar history={history} />
        </motion.section>

        {/* Milestones */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          aria-label="Streak milestones"
        >
          <SectionHeading>Milestones</SectionHeading>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {milestones.map((milestone: StreakMilestoneData, i: number) => (
              <StreakMilestone
                key={milestone.days}
                milestone={milestone}
                currentStreak={currentStreak}
                index={i}
              />
            ))}
          </div>
        </motion.section>
      </div>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StreakFlame({ streak }: { streak: number }) {
  const intensity =
    streak >= 30 ? 'high' : streak >= 14 ? 'medium' : streak >= 3 ? 'low' : 'none'

  if (intensity === 'none') {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl" aria-hidden="true">
        💤
      </div>
    )
  }

  return (
    <motion.div
      className={clsx(
        'flex h-16 w-16 items-center justify-center rounded-2xl text-3xl',
        intensity === 'high' && 'bg-orange-400/30',
        intensity === 'medium' && 'bg-amber-400/20',
        intensity === 'low' && 'bg-yellow-400/15',
      )}
      animate={{
        scale: intensity === 'high' ? [1, 1.08, 1] : [1, 1.04, 1],
      }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      {intensity === 'high' ? '🔥' : intensity === 'medium' ? '⚡' : '✨'}
    </motion.div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-xs text-indigo-200">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode | string }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-surface-500">
      {children}
    </h3>
  )
}

function StreakTrackerSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('space-y-6', className)} aria-busy="true" aria-label="Loading streak data">
      <div className="h-52 animate-pulse rounded-[2rem] bg-surface-200" />
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-surface-200" />
        <div className="h-48 animate-pulse rounded-2xl bg-surface-100" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-surface-200" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-100" />
          ))}
        </div>
      </div>
    </div>
  )
}
