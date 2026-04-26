'use client'

import React, { useState } from 'react'
import { Download, Share2, X, Copy, Check, FileText, Twitter, MessageCircle } from 'lucide-react'
import { Group } from '@/types'
import { useGroupComparison } from '@/hooks/useGroupComparison'
import { ComparisonTable, COMPARISON_METRICS, GROUP_COLORS } from './ComparisonTable'
import { ComparisonChart } from './ComparisonChart'
import { exportToPDF, exportToCSV } from '@/utils/exportData'
import { copyToClipboard, shareViaTwitter, shareViaWhatsApp } from '@/utils/shareUtils'
import clsx from 'clsx'

interface GroupComparisonProps {
  availableGroups: Group[]
}

// ─── Export helpers ──────────────────────────────────────────────────────────

function buildExportRows(groups: Group[]) {
  return COMPARISON_METRICS.map(({ key, label, format }) => [
    label,
    ...groups.map(g => format(g[key])),
  ])
}

async function handleExportPDF(groups: Group[]) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape' })

  doc.setFontSize(16)
  doc.text('Group Comparison Report', 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 26)
  doc.text(`Groups: ${groups.map(g => g.name).join(', ')}`, 14, 32)

  autoTable(doc, {
    startY: 40,
    head: [['Metric', ...groups.map(g => g.name)]],
    body: buildExportRows(groups),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    alternateRowStyles: { fillColor: [245, 247, 255] },
  })

  doc.save(`group-comparison-${new Date().toISOString().slice(0, 10)}.pdf`)
}

function handleExportCSV(groups: Group[]) {
  exportToCSV({
    title: 'Group Comparison',
    headers: ['Metric', ...groups.map(g => g.name)],
    rows: buildExportRows(groups),
    filename: `group-comparison-${new Date().toISOString().slice(0, 10)}.csv`,
  })
}

// ─── Share modal ─────────────────────────────────────────────────────────────

function ShareModal({ groups, onClose }: { groups: Group[]; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/compare?groups=${groups.map(g => g.id).join(',')}`
    : ''
  const summary = `Comparing ${groups.map(g => g.name).join(' vs ')} on Ajo`

  const copy = async () => {
    const ok = await copyToClipboard(url)
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-[#1a1040] border border-white/10 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Share Comparison</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* URL copy */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="flex-1 text-white/50 text-xs truncate">{url}</span>
          <button
            onClick={copy}
            className="flex-shrink-0 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
            aria-label="Copy link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Social share */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => shareViaTwitter(summary, url)}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-colors text-sky-400 text-sm font-medium"
          >
            <Twitter className="w-4 h-4" /> Twitter
          </button>
          <button
            onClick={() => shareViaWhatsApp(summary, url)}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors text-emerald-400 text-sm font-medium"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Export dropdown ─────────────────────────────────────────────────────────

function ExportMenu({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const runExport = async (type: 'pdf' | 'csv') => {
    setOpen(false)
    setExporting(true)
    try {
      if (type === 'pdf') await handleExportPDF(groups)
      else handleExportCSV(groups)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-all disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        {exporting ? 'Exporting…' : 'Export'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 w-40 rounded-xl bg-[#1a1040] border border-white/10 shadow-xl overflow-hidden">
            <button
              onClick={() => runExport('pdf')}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white/80 hover:bg-white/10 transition-colors"
            >
              <FileText className="w-4 h-4 text-red-400" /> Export PDF
            </button>
            <button
              onClick={() => runExport('csv')}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white/80 hover:bg-white/10 transition-colors border-t border-white/5"
            >
              <FileText className="w-4 h-4 text-emerald-400" /> Export CSV
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export const GroupComparison: React.FC<GroupComparisonProps> = ({ availableGroups }) => {
  const { selectedGroups, addGroup, removeGroup, clearAll, canAdd, MAX_COMPARE } = useGroupComparison()
  const [search, setSearch] = useState('')
  const [showShare, setShowShare] = useState(false)

  const filtered = availableGroups.filter(
    g =>
      !selectedGroups.find(s => s.id === g.id) &&
      g.name.toLowerCase().includes(search.toLowerCase())
  )

  const canCompare = selectedGroups.length >= 2

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Compare Groups</h2>
          <p className="text-white/50 text-sm">
            Select up to {MAX_COMPARE} groups to compare side-by-side
          </p>
        </div>

        {canCompare && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium transition-all"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
            <ExportMenu groups={selectedGroups} />
            <button
              onClick={clearAll}
              className="text-sm text-white/40 hover:text-red-400 transition-colors px-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Group selector */}
      <div className="rounded-2xl backdrop-blur-md bg-white/5 border border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search groups to add…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
          <span className="text-white/40 text-sm flex-shrink-0">
            {selectedGroups.length}/{MAX_COMPARE} selected
          </span>
        </div>

        {/* Selected chips */}
        {selectedGroups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedGroups.map((g, i) => (
              <div
                key={g.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border"
                style={{ borderColor: GROUP_COLORS[i] + '60', background: GROUP_COLORS[i] + '18' }}
              >
                <span style={{ color: GROUP_COLORS[i] }}>{g.name}</span>
                <button
                  onClick={() => removeGroup(g.id)}
                  className="text-white/40 hover:text-white transition-colors leading-none"
                  aria-label={`Remove ${g.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Available groups grid */}
        {canAdd && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
            {filtered.slice(0, 16).map(g => (
              <button
                key={g.id}
                onClick={() => addGroup(g)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-left group"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {g.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-medium truncate">{g.name}</p>
                  <p className="text-white/40 text-xs">{g.currentMembers}/{g.maxMembers} members</p>
                </div>
                <svg className="w-4 h-4 text-white/20 group-hover:text-white/60 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {!canAdd && (
          <p className="text-amber-400/70 text-xs">
            Maximum {MAX_COMPARE} groups selected. Remove one to add another.
          </p>
        )}

        {canAdd && filtered.length === 0 && search && (
          <p className="text-white/30 text-xs">No groups match "{search}"</p>
        )}
      </div>

      {/* Comparison results */}
      {canCompare ? (
        <div className="space-y-5">
          <ComparisonChart groups={selectedGroups} />
          <ComparisonTable groups={selectedGroups} onRemove={removeGroup} />
        </div>
      ) : (
        <div className="text-center py-16 text-white/30 text-sm">
          {selectedGroups.length === 1
            ? 'Add at least one more group to start comparing'
            : `Select 2–${MAX_COMPARE} groups above to compare them`}
        </div>
      )}

      {/* Share modal */}
      {showShare && (
        <ShareModal groups={selectedGroups} onClose={() => setShowShare(false)} />
      )}
    </div>
  )
}
