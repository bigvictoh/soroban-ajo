'use client'

import { useState } from 'react'
import { InsuranceDashboard } from '@/components/InsuranceDashboard'

export default function InsurancePage() {
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [form, setForm] = useState({ groupId: '', cycle: '', defaulter: '', amount: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const submitClaim = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`${apiBase}/api/insurance/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, cycle: Number(form.cycle), amount: Math.round(Number(form.amount) * 1e7).toString() }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setSuccess('Claim submitted successfully')
      setShowClaimForm(false)
      setForm({ groupId: '', cycle: '', defaulter: '', amount: '' })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Insurance Pool</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Shared protection fund for group members against defaults
          </p>
        </div>
        <button
          onClick={() => setShowClaimForm(!showClaimForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          File Claim
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      {showClaimForm && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">File Insurance Claim</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            File a claim when a group member defaults on their contribution. Claims are verified on-chain.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group ID</label>
              <input
                value={form.groupId}
                onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Group ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cycle Number</label>
              <input
                type="number"
                value={form.cycle}
                onChange={e => setForm(f => ({ ...f, cycle: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="1"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Defaulter Address</label>
              <input
                value={form.defaulter}
                onChange={e => setForm(f => ({ ...f, defaulter: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="G..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Claim Amount (XLM)</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="0.00"
                min="0"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={submitClaim}
              disabled={loading || !form.groupId || !form.cycle || !form.defaulter || !form.amount}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Claim'}
            </button>
            <button
              onClick={() => setShowClaimForm(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <InsuranceDashboard />
    </div>
  )
}
