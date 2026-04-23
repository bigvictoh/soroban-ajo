'use client'

import { useState, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface Badge {
  id: string
  label: string
  icon: string
  color: string
}

export interface MemberAchievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt: string
}

export interface MemberContribution {
  id: string
  amount: string
  round: number
  txHash: string
  createdAt: string
  groupName: string
  groupId: string
}

export interface MemberGroup {
  id: string
  name: string
  isActive: boolean
  joinedAt: string
}

export interface MemberProfileData {
  walletAddress: string
  name: string | null
  joinedAt: string
  verification: {
    kycLevel: number
    kycStatus: string
    emailVerified: boolean
    phoneVerified: boolean
    trustScore: number
  }
  gamification: {
    level: string
    points: number
    streakDays: number
  }
  stats: {
    totalContributions: number
    totalContributed: string
    totalReceived: string
    groupsJoined: number
    groupsCompleted: number
    activeGroups: number
    lastActiveAt: string
  }
  badges: Badge[]
  groups: MemberGroup[]
  recentContributions: MemberContribution[]
  achievements: MemberAchievement[]
}

export function useMemberProfile(address: string | undefined) {
  const [data, setData] = useState<MemberProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address) return
    setLoading(true)
    setError(null)

    fetch(`${API}/api/members/${address}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data)
        else setError(json.error ?? 'Failed to load profile')
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false))
  }, [address])

  return { data, loading, error }
}
