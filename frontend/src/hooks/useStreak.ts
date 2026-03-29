'use client'

import { useEffect, useMemo, useState } from 'react'
import { backendApiClient } from '@/lib/apiClient'

export interface StreakDay {
  date: string // ISO date string YYYY-MM-DD
  contributed: boolean
  onTime: boolean
}

export interface StreakMilestoneData {
  days: number
  label: string
  reached: boolean
  reachedAt?: string
}

export interface StreakData {
  currentStreak: number
  longestStreak: number
  totalContributions: number
  lastContribution: string | null
  history: StreakDay[]
  milestones: StreakMilestoneData[]
}

const MILESTONES = [3, 7, 14, 30, 60, 90] as const

const MILESTONE_LABELS: Record<number, string> = {
  3: 'Getting Started',
  7: 'One Week Strong',
  14: 'Two Week Warrior',
  30: 'Monthly Master',
  60: 'Two Month Champion',
  90: 'Quarter Legend',
}

const CACHE_TTL_MS = 3 * 60 * 1000
const cache = new Map<string, { timestamp: number; data: StreakData }>()

function getCached(key: string): StreakData | null {
  const item = cache.get(key)
  if (!item) return null
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return item.data
}

function setCached(key: string, data: StreakData) {
  cache.set(key, { timestamp: Date.now(), data })
}

/** Builds streak data from the gamification stats API response */
function buildStreakData(
  gamification: {
    contributionStreak: number
    lastContribution: string | null
  } | null,
  contributions: Array<{ createdAt: string }>,
): StreakData {
  const currentStreak = gamification?.contributionStreak ?? 0
  const lastContribution = gamification?.lastContribution ?? null

  // Build a 90-day history window
  const today = new Date()
  const history: StreakDay[] = []
  const contributionDates = new Set(
    contributions.map((c) => new Date(c.createdAt).toISOString().split('T')[0]),
  )

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const contributed = contributionDates.has(dateStr)
    history.push({ date: dateStr, contributed, onTime: contributed })
  }

  // Calculate longest streak from history
  let longestStreak = 0
  let running = 0
  for (const day of history) {
    if (day.contributed) {
      running++
      longestStreak = Math.max(longestStreak, running)
    } else {
      running = 0
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak)

  const milestones: StreakMilestoneData[] = MILESTONES.map((days) => ({
    days,
    label: MILESTONE_LABELS[days],
    reached: currentStreak >= days,
    reachedAt:
      currentStreak >= days && lastContribution ? lastContribution : undefined,
  }))

  return {
    currentStreak,
    longestStreak,
    totalContributions: contributions.length,
    lastContribution,
    history,
    milestones,
  }
}

/** Fallback mock data when the user is not authenticated */
function buildMockStreakData(address: string): StreakData {
  let hash = 0
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) >>> 0
  }
  const streak = 3 + (hash % 18)
  const today = new Date()
  const history: StreakDay[] = []

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    // Simulate contributions with some gaps
    const contributed = i <= streak || (hash + i) % 7 !== 0
    history.push({ date: dateStr, contributed, onTime: contributed })
  }

  const milestones: StreakMilestoneData[] = MILESTONES.map((days) => ({
    days,
    label: MILESTONE_LABELS[days],
    reached: streak >= days,
    reachedAt: streak >= days ? new Date(today.getTime() - days * 86400000).toISOString() : undefined,
  }))

  return {
    currentStreak: streak,
    longestStreak: streak + 4,
    totalContributions: 20 + (hash % 40),
    lastContribution: new Date(today.getTime() - 86400000).toISOString(),
    history,
    milestones,
  }
}

interface UseStreakOptions {
  /** Wallet address — used as cache key and for mock data seeding */
  address?: string
  /** Whether to fetch from the real API (requires auth) */
  authenticated?: boolean
}

export function useStreak({ address, authenticated = false }: UseStreakOptions = {}) {
  const cacheKey = useMemo(() => `streak:${address ?? 'guest'}`, [address])
  const [data, setData] = useState<StreakData | null>(() => getCached(cacheKey))
  const [loading, setLoading] = useState(!getCached(cacheKey))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const cached = getCached(cacheKey)
    if (cached) {
      setData(cached)
      setLoading(false)
      return () => { active = false }
    }

    setLoading(true)
    setError(null)

    async function fetchStreak() {
      try {
        if (authenticated && address) {
          const [statsRes, contribRes] = await Promise.all([
            backendApiClient.request<{
              success: boolean
              data: {
                gamification: {
                  contributionStreak: number
                  lastContribution: string | null
                } | null
              }
            }>({ path: '/api/gamification/stats', auth: 'user' }),
            backendApiClient.request<{
              success: boolean
              data: Array<{ createdAt: string }>
            }>({ path: '/api/contributions', auth: 'user' }),
          ])

          if (!active) return
          const built = buildStreakData(
            statsRes.data.gamification,
            contribRes.data ?? [],
          )
          setCached(cacheKey, built)
          setData(built)
        } else {
          // Simulate network delay for mock
          await new Promise((r) => setTimeout(r, 200))
          if (!active) return
          const mock = buildMockStreakData(address ?? 'guest')
          setCached(cacheKey, mock)
          setData(mock)
        }
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load streak data')
        // Fall back to mock on error
        const mock = buildMockStreakData(address ?? 'guest')
        setData(mock)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchStreak()
    return () => { active = false }
  }, [cacheKey, authenticated, address])

  const refresh = () => {
    cache.delete(cacheKey)
    setData(null)
    setLoading(true)
    setError(null)
  }

  return {
    loading,
    error,
    currentStreak: data?.currentStreak ?? 0,
    longestStreak: data?.longestStreak ?? 0,
    totalContributions: data?.totalContributions ?? 0,
    lastContribution: data?.lastContribution ?? null,
    history: data?.history ?? [],
    milestones: data?.milestones ?? [],
    refresh,
  }
}

export const streakTestUtils = {
  clearCache() {
    cache.clear()
  },
}
