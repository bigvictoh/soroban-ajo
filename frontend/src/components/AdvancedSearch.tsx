'use client'

import React, { useState } from 'react'
import { Search, SlidersHorizontal, Bookmark, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useAdvancedSearch, type SearchEntity } from '@/hooks/useAdvancedSearch'
import { useRouter } from 'next/navigation'

// ── Sort options ───────────────────────────────────────────────────────────

const GROUP_SORT_OPTIONS = [
  { value: 'createdAt', label: 'Newest' },
  { value: 'name', label: 'Name' },
  { value: 'contributionAmount', label: 'Amount' },
  { value: 'memberCount', label: 'Members' },
]

const MEMBER_SORT_OPTIONS = [
  { value: 'createdAt', label: 'Newest' },
  { value: 'trustScore', label: 'Trust Score' },
  { value: 'walletAddress', label: 'Address' },
]

// ── Main component ─────────────────────────────────────────────────────────

export function AdvancedSearch() {
  const router = useRouter()
  const {
    entity, setEntity,
    groupFilters, updateGroupFilter,
    memberFilters, updateMemberFilter,
    clearFilters,
    results, pagination, loading,
    runSearch,
    savedSearches, saveSearch, deleteSavedSearch, applySavedSearch,
  } = useAdvancedSearch()

  const [showFilters, setShowFilters] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)

  const q = entity === 'groups' ? groupFilters.q : memberFilters.q
  const setQ = (v: string) =>
    entity === 'groups' ? updateGroupFilter('q', v) : updateMemberFilter('q', v)

  const handleSave = async () => {
    if (!saveName.trim()) return
    await saveSearch(saveName.trim())
    setSaveName('')
    setShowSaveInput(false)
  }

  return (
    <div className="w-full space-y-4">
      {/* Search bar row */}
      <div className="flex gap-2">
        {/* Entity toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
          {(['groups', 'members'] as SearchEntity[]).map((e) => (
            <button
              key={e}
              onClick={() => setEntity(e)}
              className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
                entity === e
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Text input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />}
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={entity === 'groups' ? 'Search groups by name…' : 'Search by address, name, email…'}
            className="w-full pl-9 pr-9 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            showFilters
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {/* Save search */}
        <button
          onClick={() => setShowSaveInput((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title="Save this search"
        >
          <Bookmark className="h-4 w-4" />
        </button>
      </div>

      {/* Save search input */}
      {showSaveInput && (
        <div className="flex gap-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Name this search…"
            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button
            onClick={handleSave}
            disabled={!saveName.trim()}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
          <button onClick={() => setShowSaveInput(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Saved searches */}
      {savedSearches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {savedSearches.map((s) => (
            <div key={s.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs">
              <button
                onClick={() => applySavedSearch(s)}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium"
              >
                {s.name}
              </button>
              <button onClick={() => deleteSavedSearch(s.id)} className="text-gray-400 hover:text-red-500 ml-1">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filter panel */}
      {showFilters && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-4">
          {entity === 'groups' ? (
            <GroupFilterPanel filters={groupFilters} update={updateGroupFilter} />
          ) : (
            <MemberFilterPanel filters={memberFilters} update={updateMemberFilter} />
          )}
          <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-red-500 underline">
            Clear all filters
          </button>
        </div>
      )}

      {/* Results */}
      <div className="space-y-2">
        {results.length === 0 && !loading && q.length >= 2 && (
          <p className="text-sm text-gray-500 text-center py-6">No results found.</p>
        )}

        {entity === 'groups'
          ? results.map((g) => (
              <button
                key={g.id}
                onClick={() => router.push(`/groups/${g.id}`)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-sm">{g.name}</p>
                  <p className="text-xs text-gray-500">
                    {g._count?.members ?? 0}/{g.maxMembers} members · {g.contributionAmount} stroops
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${g.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {g.isActive ? 'Active' : 'Closed'}
                </span>
              </button>
            ))
          : results.map((m) => (
              <button
                key={m.id}
                onClick={() => router.push(`/profile/${m.walletAddress}`)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-sm truncate max-w-xs">{m.name ?? m.walletAddress}</p>
                  <p className="text-xs text-gray-500">
                    {m._count?.groups ?? 0} groups · {m._count?.contributions ?? 0} contributions
                  </p>
                </div>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {m.verification?.trustScore ?? 0}/100
                </span>
              </button>
            ))}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => runSearch(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  p === pagination.page
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Filter sub-panels ──────────────────────────────────────────────────────

function GroupFilterPanel({
  filters,
  update,
}: {
  filters: import('@/hooks/useAdvancedSearch').GroupFilters
  update: <K extends keyof import('@/hooks/useAdvancedSearch').GroupFilters>(
    k: K,
    v: import('@/hooks/useAdvancedSearch').GroupFilters[K]
  ) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
        Status
        <select
          value={filters.isActive === undefined ? '' : String(filters.isActive)}
          onChange={(e) => update('isActive', e.target.value === '' ? undefined : e.target.value === 'true')}
          className="select-field"
        >
          <option value="">Any</option>
          <option value="true">Active</option>
          <option value="false">Closed</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
        Min amount
        <input
          type="number"
          min={0}
          value={filters.minAmount ?? ''}
          onChange={(e) => update('minAmount', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="0"
          className="input-field"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
        Max amount
        <input
          type="number"
          min={0}
          value={filters.maxAmount ?? ''}
          onChange={(e) => update('maxAmount', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="∞"
          className="input-field"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
        Min members
        <input
          type="number"
          min={0}
          value={filters.minMembers ?? ''}
          onChange={(e) => update('minMembers', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="0"
          className="input-field"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
        Sort by
        <select
          value={filters.sortBy ?? 'createdAt'}
          onChange={(e) => update('sortBy', e.target.value as any)}
          className="select-field"
        >
          {GROUP_SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
        Direction
        <select
          value={filters.sortDir ?? 'desc'}
          onChange={(e) => update('sortDir', e.target.value as any)}
          className="select-field"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>
    </div>
  )
}

function MemberFilterPanel({
  filters,
  update,
}: {
  filters: import('@/hooks/useAdvancedSearch').MemberFilters
  update: <K extends keyof import('@/hooks/useAdvancedSearch').MemberFilters>(
    k: K,
    v: import('@/hooks/useAdvancedSearch').MemberFilters[K]
  ) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
        Email verified
        <select
          value={filters.emailVerified === undefined ? '' : String(filters.emailVerified)}
          onChange={(e) => update('emailVerified', e.target.value === '' ? undefined : e.target.value === 'true')}
          className="select-field"
        >
          <option value="">Any</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
        Phone verified
        <select
          value={filters.phoneVerified === undefined ? '' : String(filters.phoneVerified)}
          onChange={(e) => update('phoneVerified', e.target.value === '' ? undefined : e.target.value === 'true')}
          className="select-field"
        >
          <option value="">Any</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
        Min trust score
        <input
          type="number"
          min={0}
          max={100}
          value={filters.minTrustScore ?? ''}
          onChange={(e) => update('minTrustScore', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="0"
          className="input-field"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
        Min KYC level
        <select
          value={filters.kycLevel ?? ''}
          onChange={(e) => update('kycLevel', e.target.value ? Number(e.target.value) : undefined)}
          className="select-field"
        >
          <option value="">Any</option>
          <option value="1">1 — Email</option>
          <option value="2">2 — Phone</option>
          <option value="3">3 — Docs</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
        Sort by
        <select
          value={filters.sortBy ?? 'createdAt'}
          onChange={(e) => update('sortBy', e.target.value as any)}
          className="select-field"
        >
          {MEMBER_SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
        Direction
        <select
          value={filters.sortDir ?? 'desc'}
          onChange={(e) => update('sortDir', e.target.value as any)}
          className="select-field"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>
    </div>
  )
}
