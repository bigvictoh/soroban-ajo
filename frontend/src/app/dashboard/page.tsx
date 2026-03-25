'use client'

// Issue #318: Bento grid dashboard layout
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useDashboard } from '@/hooks/useDashboard'
import { useStaggeredAnimation } from '@/hooks/useStaggeredAnimation'
import { BentoGrid, BentoCell } from '@/components/BentoGrid'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { GroupsGrid } from '@/components/GroupsGrid'
import { GroupsList } from '@/components/GroupsList'

export default function DashboardPage() {
  const router = useRouter()
  const { address } = useAuth()
  const {
    viewMode, setViewMode,
    filterStatus, setFilterStatus,
    searchQuery, setSearchQuery,
    sortField, sortDirection, toggleSort,
    currentPage, setCurrentPage,
    totalPages, groups, totalGroups,
    isLoading,
  } = useDashboard(address || undefined)

  const bentoStyles = useStaggeredAnimation(6, 80, 50)

  const handleGroupClick = (groupId: string) => router.push(`/groups/${groupId}`)
  const handleJoinGroup = (groupId: string) => console.log('Join group:', groupId)

  const metrics = [
    {
      label: 'Active Groups',
      value: isLoading ? null : totalGroups,
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      gradient: 'from-indigo-500 to-purple-600',
      trend: { value: 'All time', positive: true },
    },
    {
      label: 'Total Saved',
      value: isLoading ? null : '$0.00',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-emerald-500 to-teal-600',
      trend: { value: 'Lifetime total', positive: true },
    },
    {
      label: 'Next Payout',
      value: isLoading ? null : 'None',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      gradient: 'from-amber-500 to-orange-600',
    },
    {
      label: 'Contributions',
      value: isLoading ? null : '0',
      icon: (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      gradient: 'from-pink-500 to-rose-600',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="page-header-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="animate-fade-in flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 dark:text-slate-100 tracking-tight">
                Dashboard
              </h1>
              <p className="mt-1.5 text-surface-500 dark:text-slate-400 text-sm sm:text-base">
                Your savings overview
              </p>
            </div>
            <Link
              href="/groups/create"
              className="btn-primary px-5 py-2.5 text-sm self-start sm:self-auto"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Group
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">

        {/* ── Bento metrics grid ── */}
        <BentoGrid>
          {/* Featured card — spans 2 cols × 2 rows on lg */}
          <BentoCell
            colSpan="col-span-1 sm:col-span-2 lg:col-span-2"
            rowSpan="row-span-1 lg:row-span-2"
            className="animate-fade-in-up"
            style={bentoStyles[0]}
          >
            <div className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 flex flex-col justify-between text-white">
              {/* Background decoration */}
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
              <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                  Welcome back
                </h2>
                <p className="mt-2 text-white/70 text-sm max-w-xs">
                  Track your savings groups and contributions all in one place.
                </p>
              </div>

              <div className="relative grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                  <p className="text-white/60 text-xs font-medium">Groups</p>
                  <p className="text-2xl font-extrabold mt-0.5">
                    {isLoading ? <span className="skeleton inline-block h-7 w-8 rounded" /> : totalGroups}
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                  <p className="text-white/60 text-xs font-medium">Saved</p>
                  <p className="text-2xl font-extrabold mt-0.5">
                    {isLoading ? <span className="skeleton inline-block h-7 w-16 rounded" /> : '$0'}
                  </p>
                </div>
              </div>
            </div>
          </BentoCell>

          {/* Metric cards */}
          {metrics.slice(0, 4).map((m, i) => (
            <BentoCell
              key={m.label}
              colSpan="col-span-1"
              rowSpan="row-span-1"
              className="animate-fade-in-up"
              style={bentoStyles[i + 1]}
            >
              <MetricCard
                label={m.label}
                value={m.value ?? '—'}
                icon={m.icon}
                gradient={m.gradient}
                trend={m.trend}
                isLoading={isLoading}
              />
            </BentoCell>
          ))}

          {/* Quick actions card */}
          <BentoCell
            colSpan="col-span-1 sm:col-span-2 lg:col-span-2"
            rowSpan="row-span-1"
            className="animate-fade-in-up"
            style={bentoStyles[5]}
          >
            <div className="h-full rounded-2xl bg-white dark:bg-slate-800 border border-surface-200/80 dark:border-slate-700 p-5 flex flex-col justify-between hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
              <p className="text-xs font-semibold text-surface-500 dark:text-slate-400 uppercase tracking-wider">
                Quick Actions
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link href="/groups/create" className="btn-gradient-primary px-4 py-2 text-xs rounded-xl">
                  + New Group
                </Link>
                <Link href="/groups" className="btn-secondary px-4 py-2 text-xs rounded-xl">
                  Browse Groups
                </Link>
                <Link href="/profile" className="btn-ghost px-4 py-2 text-xs rounded-xl border border-surface-200 dark:border-slate-700">
                  My Profile
                </Link>
              </div>
            </div>
          </BentoCell>
        </BentoGrid>

        {/* ── Groups section ── */}
        <div className="animate-fade-in-up" style={{ animationDelay: '480ms', animationFillMode: 'both' }}>
          {/* Controls */}
          <div className="mb-5 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <h2 className="text-xl font-bold text-surface-900 dark:text-slate-100">Your Groups</h2>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:flex-none sm:w-56">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-search"
                  />
                </div>
                {/* View toggle */}
                <div className="view-toggle-group flex-shrink-0">
                  <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'view-toggle-btn-active' : 'view-toggle-btn-inactive'}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'view-toggle-btn-active' : 'view-toggle-btn-inactive'}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {(['all', 'active', 'completed', 'paused'] as const).map((s) => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={filterStatus === s ? 'filter-btn-active' : 'filter-btn-inactive'}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
              {!isLoading && (
                <span className="ml-auto text-xs text-surface-400 dark:text-slate-500 self-center">
                  {(groups ?? []).length} of {totalGroups}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          {!isLoading && (groups ?? []).length === 0 ? (
            <div className="animate-fade-in text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-2xl border border-surface-200/80 dark:border-slate-700">
              <div className="empty-state-icon mb-5 animate-float mx-auto">
                <svg className="h-10 w-10 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-surface-900 dark:text-slate-100 mb-1">No groups found</h3>
              <p className="text-sm text-surface-500 dark:text-slate-400 mb-6">
                {searchQuery || filterStatus !== 'all' ? 'Try adjusting your filters' : 'Create your first savings group to get started'}
              </p>
              {!searchQuery && filterStatus === 'all' && (
                <Link href="/groups/create" className="btn-primary px-5 py-2.5 text-sm">
                  Create Your First Group
                </Link>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <GroupsGrid groups={groups ?? []} isLoading={isLoading} onGroupClick={handleGroupClick} />
          ) : (
            <GroupsList
              groups={groups ?? []} isLoading={isLoading}
              sortField={sortField} sortDirection={sortDirection}
              onSort={toggleSort} onGroupClick={handleGroupClick} onJoinGroup={handleJoinGroup}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2 animate-fade-in">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="pagination-btn px-4">
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Prev
              </button>
              <div className="flex gap-1.5">
                {[...Array(totalPages)].map((_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)}
                    className={currentPage === i + 1 ? 'pagination-btn-active' : 'pagination-btn'}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="pagination-btn px-4">
                Next
                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
