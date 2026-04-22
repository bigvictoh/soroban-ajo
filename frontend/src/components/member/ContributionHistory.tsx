'use client'

import React from 'react'

export interface ContributionEntry {
  cycle: number
  amount: number
  date: string
  status: 'on-time' | 'late' | 'missed'
}

interface ContributionHistoryProps {
  entries: ContributionEntry[]
}

const statusClasses: Record<ContributionEntry['status'], string> = {
  'on-time': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  late: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  missed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
}

export const ContributionHistory: React.FC<ContributionHistoryProps> = ({ entries }) => {
  return (
    <section aria-label="Contribution history" className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Contribution History</h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Cycle</th>
              <th className="text-left px-4 py-2 font-medium">Amount</th>
              <th className="text-left px-4 py-2 font-medium">Date</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={`${entry.cycle}-${entry.date}`} className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-4 py-2 text-slate-800 dark:text-slate-100">#{entry.cycle}</td>
                <td className="px-4 py-2 text-slate-800 dark:text-slate-100">{entry.amount.toFixed(2)} XLM</td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{entry.date}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusClasses[entry.status]}`}>
                    {entry.status.replace('-', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
