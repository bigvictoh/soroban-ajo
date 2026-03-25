/**
 * MetricCard - stat card for the bento dashboard
 * Issue #318: Bento grid dashboard layout
 */
import React from 'react'

interface MetricCardProps {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  /** Tailwind gradient classes e.g. "from-indigo-500 to-purple-600" */
  gradient?: string
  trend?: { value: string; positive: boolean }
  isLoading?: boolean
  /** 'sm' = compact, 'lg' = featured (taller) */
  size?: 'sm' | 'lg'
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  gradient = 'from-primary-500 to-accent-500',
  trend,
  isLoading = false,
  size = 'sm',
  className = '',
}) => {
  const isLarge = size === 'lg'

  if (isLoading) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-surface-200/80 dark:border-slate-700 p-5 h-full ${className}`}
        aria-busy="true"
      >
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
        <div className="skeleton h-10 w-10 rounded-xl mb-4" />
        <div className="skeleton h-3.5 w-20 rounded mb-3" />
        <div className={`skeleton rounded ${isLarge ? 'h-12 w-32' : 'h-9 w-20'}`} />
        {isLarge && <div className="skeleton h-3.5 w-24 rounded mt-3" />}
      </div>
    )
  }

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl h-full
        bg-white dark:bg-slate-800
        border border-surface-200/80 dark:border-slate-700
        p-5 flex flex-col justify-between
        transition-all duration-300 ease-out
        hover:shadow-card-hover hover:-translate-y-1
        group
        ${className}
      `}
    >
      {/* Gradient accent top bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} opacity-80 group-hover:opacity-100 transition-opacity duration-300`} />

      {/* Subtle gradient background glow */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />

      <div>
        {/* Icon */}
        <div className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${gradient} bg-opacity-10 mb-3 ${isLarge ? 'w-12 h-12' : 'w-10 h-10'}`}>
          <span className={`text-white ${isLarge ? 'w-6 h-6' : 'w-5 h-5'} flex items-center justify-center`}>
            {icon}
          </span>
        </div>

        {/* Label */}
        <p className={`font-medium text-surface-500 dark:text-slate-400 ${isLarge ? 'text-sm' : 'text-xs'}`}>
          {label}
        </p>
      </div>

      <div>
        {/* Value */}
        <p className={`font-extrabold text-surface-900 dark:text-slate-100 leading-none ${isLarge ? 'text-4xl' : 'text-2xl'}`}>
          {value}
        </p>

        {/* Trend */}
        {trend && (
          <p className={`mt-1.5 text-xs font-semibold flex items-center gap-1 ${trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d={trend.positive ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} />
            </svg>
            {trend.value}
          </p>
        )}
      </div>
    </div>
  )
}
