'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { MemberCard, type MemberProfile } from '@/components/member/MemberCard'

const mockMember: MemberProfile = {
  id: 'member-551',
  name: 'Christopher Dominic',
  avatarUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=christopher',
  walletAddress: 'GCF2...QW8N',
  joinedAt: 'March 14, 2025',
  reliabilityScore: 94,
  totalContributions: 48,
  onTimeRate: 96,
  averageContribution: 15.75,
  longestStreak: 12,
  achievements: [
    { id: 'achv-1', label: 'Top Contributor' },
    { id: 'achv-2', label: 'Perfect Streak' },
    { id: 'achv-3', label: 'Community Mentor' },
  ],
  memberships: [
    { id: 'grp-1', name: 'Lagos Builders Circle', role: 'admin' },
    { id: 'grp-2', name: 'Global Savers DAO', role: 'member' },
    { id: 'grp-3', name: 'Ajo Growth Cohort', role: 'member' },
  ],
  contributionHistory: [
    { cycle: 18, amount: 20, date: '2026-04-10', status: 'on-time' },
    { cycle: 17, amount: 15, date: '2026-03-27', status: 'on-time' },
    { cycle: 16, amount: 15, date: '2026-03-13', status: 'late' },
    { cycle: 15, amount: 10, date: '2026-02-27', status: 'on-time' },
    { cycle: 14, amount: 12, date: '2026-02-13', status: 'on-time' },
  ],
}

export default function MemberProfilePage() {
  const params = useParams<{ id: string }>()
  const memberId = params?.id

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Member ID: {memberId}</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Member Profile</h1>
        </div>
        <MemberCard member={{ ...mockMember, id: memberId || mockMember.id }} />
      </div>
    </main>
  )
}
