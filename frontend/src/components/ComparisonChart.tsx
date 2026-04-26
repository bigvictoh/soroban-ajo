'use client'

import React, { useState } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts'
import { Group } from '@/types'
import { GROUP_COLORS } from './ComparisonTable'
import clsx from 'clsx'

interface Props {
  groups: Group[]
}

function normalize(val: number, min: number, max: number) {
  if (max === min) return 50
  return Math.round(((val - min) / (max - min)) * 100)
}

const RADAR_METRICS: { key: keyof Group; label: string; higherIsBetter: boolean }[] = [
  { key: 'successRate', label: 'Success Rate', higherIsBetter: true },
  { key: 'reputationScore', label: 'Reputation', higherIsBetter: true },
  { key: 'currentMembers', label: 'Members', higherIsBetter: true },
  { key: 'totalContributions', label: 'Total Saved', higherIsBetter: true },
  { key: 'avgPayoutDays', label: 'Payout Speed', higherIsBetter: false },
  { key: 'contributionAmount', label: 'Contribution', higherIsBetter: false },
]

const BAR_METRICS: { key: keyof Group; label: string; unit: string }[] = [
  { key: 'contributionAmount', label: 'Contribution / Cycle', unit: 'XLM' },
  { key: 'successRate', label: 'Success Rate', unit: '%' },
  { key: 'reputationScore', label: 'Reputation Score', unit: '/100' },
  { key: 'currentMembers', label: 'Members', unit: '' },
]

type ChartMode = 'radar' | 'bar'

export const ComparisonChart: React.FC<Props> = ({ groups }) => {
  const [mode, setMode] = useState<ChartMode>('radar')
  const [activeBar, setActiveBar] = useState(BAR_METRICS[0].key)

  if (groups.length < 2) return null

  // Radar data
  const radarData = RADAR_METRICS.map(({ key, label, higherIsBetter }) => {
    const vals = groups.map(g => {
      const v = Number(g[key])
      return isNaN(v) ? 0 : v
    })
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const entry: Record<string, string | number> = { metric: label }
    groups.forEach((g, i) => {
      const v = Number(g[key])
      const normalized = isNaN(v) ? 0 : normalize(v, min, max)
      // Invert for "lower is better" metrics so radar always shows "bigger = better"
      entry[`g${i}`] = higherIsBetter ? normalized : 100 - normalized
    })
    return entry
  })

  // Bar data for selected metric
  const barMetric = BAR_METRICS.find(m => m.key === activeBar) ?? BAR_METRICS[0]
  const barData = groups.map((g, i) => ({
    name: g.name.length > 12 ? g.name.slice(0, 12) + '…' : g.name,
    value: Number(g[barMetric.key]) || 0,
    color: GROUP_COLORS[i],
  }))

  return (
    <div className="rounded-2xl backdrop-blur-md bg-white/5 border border-white/10 p-5 space-y-4">
      {/* Header + toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">Visual Comparison</h3>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/10">
          {(['radar', 'bar'] as ChartMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={clsx(
                'px-3 py-1 rounded-md text-xs font-medium transition-all capitalize',
                mode === m
                  ? 'bg-white/20 text-white'
                  : 'text-white/40 hover:text-white/70'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === 'radar' && (
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: '#1e1b4b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                color: '#fff',
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => {
                const idx = parseInt(name.replace('g', ''))
                return [`${value}`, groups[idx]?.name]
              }}
            />
            <Legend
              formatter={(value) => {
                const idx = parseInt(value.replace('g', ''))
                return <span style={{ color: GROUP_COLORS[idx], fontSize: 12 }}>{groups[idx]?.name}</span>
              }}
            />
            {groups.map((_, i) => (
              <Radar
                key={i}
                name={`g${i}`}
                dataKey={`g${i}`}
                stroke={GROUP_COLORS[i]}
                fill={GROUP_COLORS[i]}
                fillOpacity={0.12}
                strokeWidth={2}
                dot={{ r: 3, fill: GROUP_COLORS[i] }}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      )}

      {mode === 'bar' && (
        <div className="space-y-3">
          {/* Metric selector */}
          <div className="flex flex-wrap gap-2">
            {BAR_METRICS.map(m => (
              <button
                key={String(m.key)}
                onClick={() => setActiveBar(m.key)}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-medium transition-all border',
                  activeBar === m.key
                    ? 'bg-indigo-500/30 border-indigo-400/60 text-indigo-300'
                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#1e1b4b',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v.toLocaleString()} ${barMetric.unit}`, barMetric.label]}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
