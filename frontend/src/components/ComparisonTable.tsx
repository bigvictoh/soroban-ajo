'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus, Star } from 'lucide-react'
import { Group } from '@/types'
import clsx from 'clsx'

export interface ComparisonMetric {
  key: keyof Group
  label: string
  format: (v: unknown) => string
  /** undefined = not comparable numerically */
  higherIsBetter?: boolean
  /** Show a bar indicator */
  showBar?: boolean
}

export const COMPARISON_METRICS: ComparisonMetric[] = [
  {
    key: 'contributionAmount',
    label: 'Contribution / Cycle',
    format: v => `${Number(v).toLocaleString()} XLM`,
    higherIsBetter: false,
    showBar: true,
  },
  {
    key: 'frequency',
    label: 'Frequency',
    format: v => v ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : '—',
  },
  {
    key: 'cycleLength',
    label: 'Cycle Length',
    format: v => `${v} days`,
    higherIsBetter: false,
    showBar: true,
  },
  {
    key: 'currentMembers',
    label: 'Current Members',
    format: v => String(v),
    higherIsBetter: true,
    showBar: true,
  },
  {
    key: 'maxMembers',
    label: 'Max Capacity',
    format: v => String(v),
    higherIsBetter: true,
    showBar: true,
  },
  {
    key: 'totalContributions',
    label: 'Total Collected',
    format: v => `${Number(v).toLocaleString()} XLM`,
    higherIsBetter: true,
    showBar: true,
  },
  {
    key: 'successRate',
    label: 'Success Rate',
    format: v => v != null ? `${Number(v).toFixed(0)}%` : '—',
    higherIsBetter: true,
    showBar: true,
  },
  {
    key: 'avgPayoutDays',
    label: 'Avg Payout Time',
    format: v => v != null ? `${Number(v).toFixed(1)} days` : '—',
    higherIsBetter: false,
    showBar: true,
  },
  {
    key: 'reputationScore',
    label: 'Reputation Score',
    format: v => v != null ? `${Number(v).toFixed(0)} / 100` : '—',
    higherIsBetter: true,
    showBar: true,
  },
  {
    key: 'status',
    label: 'Status',
    format: v => String(v).charAt(0).toUpperCase() + String(v).slice(1),
  },
]

export const GROUP_COLORS = ['#818cf8', '#f472b6', '#34d399', '#fb923c'] as const

interface Props {
  groups: Group[]
  onRemove: (id: string) => void
}

function pctDiff(a: number, b: number): string | null {
  if (isNaN(a) || isNaN(b) || b === 0) return null
  const d = ((a - b) / b) * 100
  return `${d >= 0 ? '+' : ''}${d.toFixed(0)}%`
}

function BarIndicator({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="w-full h-1 rounded-full bg-white/10 mt-1.5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

function DiffBadge({ diff, higherIsBetter }: { diff: string; higherIsBetter: boolean }) {
  const isPositive = diff.startsWith('+')
  const isNeutral = diff === '+0%' || diff === '-0%'
  const isGood = isNeutral ? null : (isPositive ? higherIsBetter : !higherIsBetter)

  if (isNeutral) return (
    <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-white/10 text-white/40">
      <Minus className="w-3 h-3" /> {diff}
    </span>
  )

  return (
    <span className={clsx(
      'inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium',
      isGood ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
    )}>
      {isPositive
        ? <TrendingUp className="w-3 h-3" />
        : <TrendingDown className="w-3 h-3" />}
      {diff}
    </span>
  )
}

export const ComparisonTable: React.FC<Props> = ({ groups, onRemove }) => {
  if (!groups.length) return null

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-sm border-collapse">
        {/* Group headers */}
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left p-4 text-white/40 font-medium w-44 sticky left-0 bg-[#0f0c29]/80 backdrop-blur-sm z-10">
              Metric
            </th>
            {groups.map((g, i) => (
              <th key={g.id} className="p-4 text-center min-w-[180px]">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: GROUP_COLORS[i] + '30', border: `2px solid ${GROUP_COLORS[i]}` }}
                  >
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold truncate max-w-[140px] text-sm" style={{ color: GROUP_COLORS[i] }}>
                    {g.name}
                  </span>
                  <button
                    onClick={() => onRemove(g.id)}
                    className="text-white/30 hover:text-red-400 transition-colors text-xs"
                    aria-label={`Remove ${g.name}`}
                  >
                    ✕ Remove
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {COMPARISON_METRICS.map(({ key, label, format, higherIsBetter, showBar }) => {
            const rawVals = groups.map(g => Number(g[key]))
            const isNumeric = rawVals.every(v => !isNaN(v)) && higherIsBetter !== undefined
            const validVals = isNumeric ? rawVals.filter(v => !isNaN(v)) : []
            const maxVal = validVals.length ? Math.max(...validVals) : 0
            const best = isNumeric
              ? (higherIsBetter ? Math.max(...rawVals) : Math.min(...rawVals))
              : null
            const baseline = rawVals[0]

            return (
              <tr key={key} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                <td className="p-4 text-white/50 font-medium sticky left-0 bg-[#0f0c29]/80 backdrop-blur-sm z-10">
                  {label}
                </td>
                {groups.map((g, i) => {
                  const raw = Number(g[key])
                  const isBest = isNumeric && raw === best && !isNaN(raw)
                  const diff = isNumeric && i > 0 && !isNaN(raw) && !isNaN(baseline)
                    ? pctDiff(raw, baseline)
                    : null

                  return (
                    <td key={g.id} className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={clsx(
                          'font-semibold text-sm flex items-center gap-1',
                          isBest ? 'text-emerald-400' : 'text-white'
                        )}>
                          {format(g[key])}
                          {isBest && <Star className="w-3 h-3 fill-emerald-400 text-emerald-400" />}
                        </span>

                        {showBar && isNumeric && !isNaN(raw) && (
                          <BarIndicator value={raw} max={maxVal} color={GROUP_COLORS[i]} />
                        )}

                        {diff && higherIsBetter !== undefined && (
                          <DiffBadge diff={diff} higherIsBetter={higherIsBetter} />
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
