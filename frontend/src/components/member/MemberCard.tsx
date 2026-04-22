'use client'

import React from 'react'
import Image from 'next/image'
import { ContributionHistory, type ContributionEntry } from './ContributionHistory'
import { MemberStats } from './MemberStats'

interface Achievement {
  id: string
  label: string
}

interface GroupMembership {
  id: string
  name: string
  role: 'admin' | 'member'
}

export interface MemberProfile {
  id: string
  name: string
  avatarUrl: string
  walletAddress: string
  joinedAt: string
  reliabilityScore: number
  totalContributions: number
  onTimeRate: number
  averageContribution: number
  longestStreak: number
  achievements: Achievement[]
  memberships: GroupMembership[]
  contributionHistory: ContributionEntry[]
}

interface MemberCardProps {
  member: MemberProfile
}

export const MemberCard: React.FC<MemberCardProps> = ({ member }) => {
  return (
    <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 p-6 shadow-sm space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Image
            src={member.avatarUrl}
            alt={`${member.name} avatar`}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-indigo-200 dark:ring-indigo-700"
            unoptimized
          />
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{member.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{member.walletAddress}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Joined {member.joinedAt}</p>
          </div>
        </div>
      </header>

      <MemberStats
        reliabilityScore={member.reliabilityScore}
        totalContributions={member.totalContributions}
        onTimeRate={member.onTimeRate}
        averageContribution={member.averageContribution}
        longestStreak={member.longestStreak}
      />

      <section className="space-y-3" aria-label="Achievements">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Achievements</h3>
        <div className="flex flex-wrap gap-2">
          {member.achievements.map((achievement) => (
            <span
              key={achievement.id}
              className="inline-flex items-center rounded-full border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300"
            >
              {achievement.label}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-label="Group memberships">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Group Memberships</h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {member.memberships.map((membership) => (
            <li
              key={membership.id}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 flex items-center justify-between"
            >
              <span className="text-sm text-slate-800 dark:text-slate-100">{membership.name}</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {membership.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <ContributionHistory entries={member.contributionHistory} />
    </article>
  )
}
