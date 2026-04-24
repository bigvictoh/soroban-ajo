import React from 'react'
import { Group } from '@/types'

interface ComparisonTableProps {
  groups: Group[]
  onRemove: (id: string) => void
}

const COLORS = ['#818cf8', '#f472b6', '#34d399']

const METRICS: { key: keyof Group; label: string; format: (v: unknown) => string; higherIsBetter?: boolean }[] = [
  { key: 'contributionAmount', label: 'Contribution / Cycle', format: v => `$${Number(v).toLocaleString()}`, higherIsBetter: false },
  { key: 'cycleLength', label: 'Cycle Length', format: v => `${v} days`, higherIsBetter: false },
  { key: 'maxMembers', label: 'Max Members', format: v => String(v), higherIsBetter: true },
  { key: 'currentMembers', label: 'Current Members', format: v => String(v), higherIsBetter: true },
  { key: 'totalContributions', label: 'Total Collected', format: v => `$${Number(v).toLocaleString()}`, higherIsBetter: true },
  { key: 'status', label: 'Status', format: v => String(v) },
]

function pctDiff(a: number, b: number): string {
  if (b === 0) return '—'
  const d = ((a - b) / b) * 100
  return `${d >= 0 ? '+' : ''}${d.toFixed(0)}%`
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ groups, onRemove }) => {
  if (!groups.length) return null

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left p-4 text-white/40 font-medium w-40">Metric</th>
            {groups.map((g, i) => (
              <th key={g.id} className="p-4 text-center min-w-[160px]">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: COLORS[i] + '40', border: `2px solid ${COLORS[i]}` }}
                  >
                    {g.name.charAt(0)}
                  </div>
                  <span className="text-white font-semibold truncate max-w-[120px]" style={{ color: COLORS[i] }}>{g.name}</span>
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
          {METRICS.map(({ key, label, format, higherIsBetter }) => {
            const vals = groups.map(g => Number(g[key]))
            const isNumeric = vals.every(v => !isNaN(v)) && higherIsBetter !== undefined
            const best = isNumeric
              ? (higherIsBetter ? Math.max(...vals) : Math.min(...vals))
              : null
            const baseline = vals[0]

            return (
              <tr key={key} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 text-white/50 font-medium">{label}</td>
                {groups.map((g, i) => {
                  const raw = Number(g[key])
                  const isBest = isNumeric && raw === best
                  const diff = isNumeric && i > 0 ? pctDiff(raw, baseline) : null
                  const diffPositive = diff && diff.startsWith('+')
                  const diffNegative = diff && diff.startsWith('-')

                  return (
                    <td key={g.id} className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`font-semibold ${isBest ? 'text-emerald-400' : 'text-white'}`}
                        >
                          {format(g[key])}
                          {isBest && <span className="ml-1 text-xs">★</span>}
                        </span>
                        {diff && (
                          <span
                            className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                              diffPositive
                                ? higherIsBetter
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/20 text-red-400'
                                : diffNegative
                                  ? higherIsBetter
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-white/10 text-white/40'
                            }`}
                          >
                            {diff} vs {groups[0].name.split(' ')[0]}
                          </span>
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
