'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMemberProfile } from '@/hooks/useMemberProfile'
import type { Badge, MemberContribution, MemberGroup, MemberAchievement } from '@/hooks/useMemberProfile'

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr
}

function xlm(stroops: string) {
  return `${(Number(stroops) / 1e7).toFixed(2)} XLM`
}

const BADGE_COLORS: Record<string, string> = {
  green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TrustBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Trust Score</span>
        <span className="font-semibold text-gray-800 dark:text-gray-200">{score}/100</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

function BadgeChip({ badge }: { badge: Badge }) {
  const cls = BADGE_COLORS[badge.color] ?? BADGE_COLORS.slate
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      {badge.icon} {badge.label}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      {children}
    </section>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MemberProfilePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const address = params?.id ?? ''
  const { data, loading, error } = useMemberProfile(address)

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-gray-500">{error ?? 'Member not found'}</p>
          <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">← Go back</button>
        </div>
      </main>
    )
  }

  const { verification, gamification, stats, badges, groups, recentContributions, achievements } = data

  const reliabilityColor =
    verification.trustScore >= 80
      ? 'text-green-600 dark:text-green-400'
      : verification.trustScore >= 50
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400'

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="mx-auto max-w-3xl space-y-5">

        {/* Back */}
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1">
          ← Back
        </button>

        {/* Hero card */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shrink-0 select-none">
              {address.slice(0, 2).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {data.name ?? fmt(data.walletAddress)}
              </h1>
              <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">{data.walletAddress}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Joined {new Date(data.joinedAt).toLocaleDateString()}
              </p>

              {/* Level + streak */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {gamification.level}
                </span>
                <span className="text-xs text-gray-500">{gamification.points.toLocaleString()} pts</span>
                {gamification.streakDays > 0 && (
                  <span className="text-xs text-orange-600 dark:text-orange-400">🔥 {gamification.streakDays}d streak</span>
                )}
              </div>
            </div>

            {/* Trust score ring */}
            <div className="text-center shrink-0">
              <p className={`text-2xl font-bold ${reliabilityColor}`}>{verification.trustScore}</p>
              <p className="text-xs text-gray-400">trust</p>
            </div>
          </div>

          <div className="mt-4">
            <TrustBar score={verification.trustScore} />
          </div>

          {/* Verification pills */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${verification.emailVerified ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
              {verification.emailVerified ? '✓' : '○'} Email
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${verification.phoneVerified ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
              {verification.phoneVerified ? '✓' : '○'} Phone
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${verification.kycStatus === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : verification.kycStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
              KYC L{verification.kycLevel}
            </span>
          </div>
        </div>

        {/* Stats dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Contributions" value={stats.totalContributions} />
          <StatCard label="Total Contributed" value={xlm(stats.totalContributed)} />
          <StatCard label="Total Received" value={xlm(stats.totalReceived)} />
          <StatCard label="Groups Joined" value={stats.groupsJoined} />
          <StatCard label="Cycles Completed" value={stats.groupsCompleted} />
          <StatCard label="Active Groups" value={stats.activeGroups} />
        </div>

        {/* Reputation badges */}
        {badges.length > 0 && (
          <Section title="Reputation Badges">
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => <BadgeChip key={b.id} badge={b} />)}
            </div>
          </Section>
        )}

        {/* Achievements */}
        {achievements.length > 0 && (
          <Section title="Achievements">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {achievements.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <span className="text-2xl">{a.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.title}</p>
                    {a.description && <p className="text-xs text-gray-500 dark:text-gray-400">{a.description}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(a.unlockedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Group memberships */}
        {groups.length > 0 && (
          <Section title="Group Memberships">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {groups.map((g) => (
                <li key={g.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{g.name}</span>
                  <span className={`text-xs ml-2 shrink-0 ${g.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                    {g.isActive ? 'Active' : 'Closed'}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Activity history */}
        {recentContributions.length > 0 && (
          <Section title="Recent Contributions">
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentContributions.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.groupName}</p>
                    <p className="text-xs text-gray-400">Round {c.round} · {new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 shrink-0 ml-4">
                    {xlm(c.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

      </div>
    </main>
  )
}
