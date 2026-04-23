'use client'

import { useState } from 'react'

interface Loan {
  id: string
  groupId: string
  borrower: string
  amount: string
  interestRateBps: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'REPAID' | 'DEFAULTED'
  votesFor: number
  votesAgainst: number
  votingDeadline: number
  dueAt: number
  amountRepaid: string
}

interface LoanDashboardProps {
  groupId: string
  walletAddress?: string
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REPAID: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  DEFAULTED: 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300',
}

export default function LoanDashboard({ groupId, walletAddress }: LoanDashboardProps) {
  const [loans] = useState<Loan[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount: '', interestRateBps: 500, repaymentPeriod: 30 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const requestLoan = async () => {
    if (!walletAddress) return setError('Connect your wallet first')
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/api/loans/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ groupId, amount: form.amount, interestRateBps: form.interestRateBps, repaymentPeriod: form.repaymentPeriod * 86400 }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setShowForm(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const vote = async (loanId: string, inFavor: boolean) => {
    if (!walletAddress) return setError('Connect your wallet first')
    try {
      const res = await fetch(`${apiBase}/api/loans/${loanId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ inFavor }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const formatAmount = (stroops: string) => (Number(stroops) / 1e7).toFixed(2)
  const formatDate = (ts: number) => ts ? new Date(ts * 1000).toLocaleDateString() : '—'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Group Loans</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Request and manage loans from the group pool</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Request Loan
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">New Loan Request</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (XLM)</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="0.00"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Interest Rate: {(form.interestRateBps / 100).toFixed(1)}%
              </label>
              <input
                type="range"
                min={100}
                max={2000}
                step={100}
                value={form.interestRateBps}
                onChange={e => setForm(f => ({ ...f, interestRateBps: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Repayment Period: {form.repaymentPeriod} days
              </label>
              <input
                type="range"
                min={7}
                max={90}
                step={7}
                value={form.repaymentPeriod}
                onChange={e => setForm(f => ({ ...f, repaymentPeriod: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={requestLoan}
                disabled={loading || !form.amount}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loans.length === 0 ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">No loans yet. Be the first to request one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {loans.map(loan => (
            <div key={loan.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatAmount(loan.amount)} XLM
                    <span className="ml-2 text-xs text-gray-500">@ {(loan.interestRateBps / 100).toFixed(1)}% interest</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {loan.borrower.slice(0, 8)}...{loan.borrower.slice(-4)}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[loan.status]}`}>
                  {loan.status}
                </span>
              </div>

              {loan.status === 'ACTIVE' && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Repaid: {formatAmount(loan.amountRepaid)} XLM</span>
                    <span>Due: {formatDate(loan.dueAt)}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min((Number(loan.amountRepaid) / Number(loan.amount)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {loan.status === 'PENDING' && loan.borrower !== walletAddress && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => vote(loan.id, true)}
                    className="flex-1 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                  >
                    ✓ Approve ({loan.votesFor})
                  </button>
                  <button
                    onClick={() => vote(loan.id, false)}
                    className="flex-1 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
                  >
                    ✗ Reject ({loan.votesAgainst})
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
