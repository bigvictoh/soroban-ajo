'use client'

import { useState } from 'react'

interface EmergencyRequest {
  id: string
  groupId: string
  requester: string
  amount: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISBURSED' | 'REPAID'
  votesFor: number
  votesAgainst: number
  votingDeadline: number
  repayBy: number
  amountRepaid: string
}

interface EmergencyFundProps {
  groupId: string
  walletAddress?: string
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DISBURSED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REPAID: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export default function EmergencyFund({ groupId, walletAddress }: EmergencyFundProps) {
  const [requests] = useState<EmergencyRequest[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount: '', reason: '', repayDays: 30 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const submitRequest = async () => {
    if (!walletAddress) return setError('Connect your wallet first')
    if (!form.reason.trim()) return setError('Please provide a reason')
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/api/emergency/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ groupId, amount: form.amount, reason: form.reason, repayPeriod: form.repayDays * 86400 }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setShowForm(false)
      setForm({ amount: '', reason: '', repayDays: 30 })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const vote = async (reqId: string, inFavor: boolean) => {
    if (!walletAddress) return setError('Connect your wallet first')
    try {
      const res = await fetch(`${apiBase}/api/emergency/${reqId}/vote`, {
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
  const timeLeft = (deadline: number) => {
    const diff = deadline * 1000 - Date.now()
    if (diff <= 0) return 'Expired'
    const hours = Math.floor(diff / 3600000)
    return hours < 24 ? `${hours}h left` : `${Math.floor(hours / 24)}d left`
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Emergency Fund</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Request urgent withdrawals with fast group approval</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
        >
          Emergency Request
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h4 className="font-semibold text-orange-900 dark:text-orange-300">Emergency Withdrawal Request</h4>
          </div>
          <p className="text-xs text-orange-700 dark:text-orange-400 mb-4">
            This will be voted on by group members within 24 hours. Funds must be repaid.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (XLM)</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                placeholder="0.00"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Emergency</label>
              <textarea
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
                rows={3}
                placeholder="Describe your emergency..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Repayment Period: {form.repayDays} days
              </label>
              <input
                type="range"
                min={7}
                max={90}
                step={7}
                value={form.repayDays}
                onChange={e => setForm(f => ({ ...f, repayDays: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={submitRequest}
                disabled={loading || !form.amount || !form.reason}
                className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Emergency Request'}
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

      {requests.length === 0 ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-sm">No emergency requests. The group fund is available if needed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatAmount(req.amount)} XLM
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{req.reason}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {req.requester.slice(0, 8)}...{req.requester.slice(-4)}
                  </p>
                </div>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_COLORS[req.status]}`}>
                  {req.status}
                </span>
              </div>

              {req.status === 'PENDING' && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>Votes: {req.votesFor} for / {req.votesAgainst} against</span>
                    <span className="text-orange-600 dark:text-orange-400">{timeLeft(req.votingDeadline)}</span>
                  </div>
                  {req.requester !== walletAddress && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => vote(req.id, true)}
                        className="flex-1 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => vote(req.id, false)}
                        className="flex-1 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}
                </div>
              )}

              {req.status === 'DISBURSED' && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Repay by: {formatDate(req.repayBy)} · Repaid: {formatAmount(req.amountRepaid)} XLM
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
