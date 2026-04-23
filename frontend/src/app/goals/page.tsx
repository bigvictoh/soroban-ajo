'use client'

import { useState, useEffect } from 'react'

interface Goal {
  id: string
  title: string
  description?: string
  targetAmount: string
  currentAmount: string
  deadline: string
  category: string
  status: string
}

const CATEGORIES = ['EMERGENCY', 'VACATION', 'EDUCATION', 'HOME', 'RETIREMENT', 'CUSTOM']

export default function SavingsGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', targetAmount: '', deadline: '', category: 'CUSTOM' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  useEffect(() => {
    if (!token) return
    fetch(`${apiBase}/api/goals`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setGoals(d.data) })
      .catch(() => {})
  }, [token])

  const createGoal = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/api/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, targetAmount: Math.round(Number(form.targetAmount) * 1e7) }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setGoals(g => [data.data, ...g])
      setShowForm(false)
      setForm({ title: '', description: '', targetAmount: '', deadline: '', category: 'CUSTOM' })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteGoal = async (id: string) => {
    try {
      await fetch(`${apiBase}/api/goals/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      setGoals(g => g.filter(x => x.id !== id))
    } catch {}
  }

  const progress = (goal: Goal) => {
    const current = Number(goal.currentAmount) / 1e7
    const target = Number(goal.targetAmount) / 1e7
    return target > 0 ? Math.min((current / target) * 100, 100) : 0
  }

  const formatXLM = (stroops: string) => (Number(stroops) / 1e7).toFixed(2)
  const daysLeft = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / 86400000))
  }

  const categoryColor: Record<string, string> = {
    EMERGENCY: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    VACATION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    EDUCATION: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    HOME: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    RETIREMENT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    CUSTOM: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Savings Goals</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track your progress towards financial milestones</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New Goal
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Create New Goal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. Emergency Fund"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Amount (XLM)</label>
              <input
                type="number"
                value={form.targetAmount}
                onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="0.00"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Optional description"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={createGoal}
              disabled={loading || !form.title || !form.targetAmount || !form.deadline}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Create Goal'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {goals.length === 0 && !showForm ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 mb-4">No savings goals yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Create your first goal
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {goals.map(goal => {
            const pct = progress(goal)
            const days = daysLeft(goal.deadline)
            return (
              <div key={goal.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{goal.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${categoryColor[goal.category] ?? categoryColor.CUSTOM}`}>
                        {goal.category}
                      </span>
                    </div>
                    {goal.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{goal.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="ml-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    aria-label="Delete goal"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatXLM(goal.currentAmount)} / {formatXLM(goal.targetAmount)} XLM
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Deadline: {new Date(goal.deadline).toLocaleDateString()}</span>
                  <span className={days <= 7 ? 'text-red-500 font-medium' : ''}>
                    {days === 0 ? 'Due today' : `${days} days left`}
                  </span>
                </div>

                {pct >= 100 && (
                  <div className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Goal achieved! 🎉
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
