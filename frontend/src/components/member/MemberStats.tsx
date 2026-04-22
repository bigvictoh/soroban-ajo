'use client'

import React from 'react'

interface MemberStatsProps {
  reliabilityScore: number
  totalContributions: number
  onTimeRate: number
  averageContribution: number
  longestStreak: number
}

function getReliabilityStyles(score: number): string {
  if (score >= 90) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 75) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

function getReliabilityBar(score: number): string {
  if (score >= 90) return 'from-emerald-500 to-teal-500'
  if (score >= 75) return 'from-amber-500 to-orange-500'
  return 'from-rose-500 to-red-500'
}

export const MemberStats: React.FC<MemberStatsProps> = ({
  reliabilityScore,
  totalContributions,
  onTimeRate,
  averageContribution,
  longestStreak,
}) => {
  const statCards = [
    { label: 'Total Contributions', value: totalContributions.toLocaleString() },
    { label: 'On-Time Rate', value: `${onTimeRate}%` },
    { label: 'Avg. Contribution', value: `${averageContribution.toFixed(2)} XLM` },
    { label: 'Longest Streak', value: `${longestStreak} cycles` },
  ]

  return (
    <section className="space-y-4" aria-label="Member statistics">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Reliability Score</h3>
          <span className={`text-lg font-bold ${getReliabilityStyles(reliabilityScore)}`}>
            {reliabilityScore}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getReliabilityBar(reliabilityScore)} transition-all duration-500`}
            style={{ width: `${Math.min(Math.max(reliabilityScore, 0), 100)}%` }}
            role="progressbar"
            aria-valuenow={reliabilityScore}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Reliability score ${reliabilityScore}%`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{stat.label}</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
