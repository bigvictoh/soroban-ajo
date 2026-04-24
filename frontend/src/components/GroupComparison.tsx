'use client'

import React, { useState } from 'react'
import { Download } from 'lucide-react'
import { Group } from '@/types'
import { useGroupComparison } from '@/hooks/useGroupComparison'
import { ComparisonTable } from './ComparisonTable'
import { ComparisonChart } from './ComparisonChart'

interface GroupComparisonProps {
  availableGroups: Group[]
}

const COLORS = ['#818cf8', '#f472b6', '#34d399']

const METRICS: { key: keyof Group; label: string; format: (v: unknown) => string }[] = [
  { key: 'contributionAmount', label: 'Contribution / Cycle', format: v => `$${Number(v).toLocaleString()}` },
  { key: 'cycleLength', label: 'Cycle Length', format: v => `${v} days` },
  { key: 'maxMembers', label: 'Max Members', format: v => String(v) },
  { key: 'currentMembers', label: 'Current Members', format: v => String(v) },
  { key: 'totalContributions', label: 'Total Collected', format: v => `$${Number(v).toLocaleString()}` },
  { key: 'status', label: 'Status', format: v => String(v) },
]

async function exportComparisonPDF(groups: Group[]) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(16)
  doc.text('Group Comparison Report', 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 26)

  // Summary table
  autoTable(doc, {
    startY: 34,
    head: [['Metric', ...groups.map(g => g.name)]],
    body: METRICS.map(({ key, label, format }) => [
      label,
      ...groups.map(g => format(g[key])),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    alternateRowStyles: { fillColor: [245, 247, 255] },
  })

  doc.save(`group-comparison-${new Date().toISOString().slice(0, 10)}.pdf`)
}

export const GroupComparison: React.FC<GroupComparisonProps> = ({ availableGroups }) => {
  const { selectedGroups, addGroup, removeGroup, clearAll, canAdd, MAX_COMPARE } = useGroupComparison()
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)

  const filtered = availableGroups.filter(
    g =>
      !selectedGroups.find(s => s.id === g.id) &&
      g.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      await exportComparisonPDF(selectedGroups)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Compare Groups</h2>
          <p className="text-white/50 text-sm">Select up to {MAX_COMPARE} groups to compare side-by-side</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedGroups.length >= 2 && (
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
          )}
          {selectedGroups.length > 0 && (
            <button
              onClick={clearAll}
              className="text-sm text-white/40 hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Group selector */}
      <div className="rounded-2xl backdrop-blur-md bg-white/5 border border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search groups to add..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>
          <span className="text-white/40 text-sm flex-shrink-0">
            {selectedGroups.length}/{MAX_COMPARE} selected
          </span>
        </div>

        {/* Selected chips */}
        {selectedGroups.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedGroups.map((g, i) => (
              <div
                key={g.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white border"
                style={{ borderColor: COLORS[i] + '60', background: COLORS[i] + '20' }}
              >
                <span style={{ color: COLORS[i] }}>{g.name}</span>
                <button onClick={() => removeGroup(g.id)} className="text-white/40 hover:text-white transition-colors">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Available groups list */}
        {canAdd && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {filtered.slice(0, 12).map(g => (
              <button
                key={g.id}
                onClick={() => addGroup(g)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left group"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {g.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium truncate">{g.name}</p>
                  <p className="text-white/40 text-xs">{g.currentMembers}/{g.maxMembers} members</p>
                </div>
                <svg className="w-4 h-4 text-white/20 group-hover:text-white/60 ml-auto flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {!canAdd && (
          <p className="text-amber-400/70 text-xs">Maximum {MAX_COMPARE} groups selected. Remove one to add another.</p>
        )}
      </div>

      {/* Comparison results */}
      {selectedGroups.length >= 2 ? (
        <div className="space-y-5">
          <ComparisonChart groups={selectedGroups} />
          <ComparisonTable groups={selectedGroups} onRemove={removeGroup} />
        </div>
      ) : selectedGroups.length === 1 ? (
        <div className="text-center py-12 text-white/40 text-sm">
          Add at least one more group to start comparing
        </div>
      ) : (
        <div className="text-center py-12 text-white/40 text-sm">
          Select 2–{MAX_COMPARE} groups above to compare them
        </div>
      )}
    </div>
  )
}
