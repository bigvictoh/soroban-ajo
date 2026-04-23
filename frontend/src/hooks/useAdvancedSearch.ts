'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuthStore } from './useAuth'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export type SearchEntity = 'groups' | 'members'
export type SortDir = 'asc' | 'desc'

export interface GroupFilters {
  q: string
  isActive?: boolean
  minAmount?: number
  maxAmount?: number
  minMembers?: number
  maxMembers?: number
  sortBy?: 'name' | 'contributionAmount' | 'createdAt' | 'memberCount'
  sortDir?: SortDir
}

export interface MemberFilters {
  q: string
  emailVerified?: boolean
  phoneVerified?: boolean
  minTrustScore?: number
  kycLevel?: number
  sortBy?: 'walletAddress' | 'createdAt' | 'trustScore'
  sortDir?: SortDir
}

export interface SavedSearch {
  id: string
  name: string
  entity: SearchEntity
  filters: GroupFilters | MemberFilters
  createdAt: string
}

const DEFAULT_GROUP_FILTERS: GroupFilters = { q: '', sortBy: 'createdAt', sortDir: 'desc' }
const DEFAULT_MEMBER_FILTERS: MemberFilters = { q: '', sortBy: 'createdAt', sortDir: 'desc' }

function toQS(obj: Record<string, any>): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== '' && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')
}

export function useAdvancedSearch() {
  const { session } = useAuthStore()
  const token = (session as any)?.token as string | undefined

  const [entity, setEntity] = useState<SearchEntity>('groups')
  const [groupFilters, setGroupFilters] = useState<GroupFilters>(DEFAULT_GROUP_FILTERS)
  const [memberFilters, setMemberFilters] = useState<MemberFilters>(DEFAULT_MEMBER_FILTERS)
  const [results, setResults] = useState<any[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 })
  const [loading, setLoading] = useState(false)
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Search ───────────────────────────────────────────────────────────────

  const runSearch = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const filters = entity === 'groups' ? { ...groupFilters, page } : { ...memberFilters, page }
      const qs = toQS(filters as any)
      const res = await fetch(`${API}/api/search/${entity}?${qs}`)
      const json = await res.json()
      setResults(json.data ?? [])
      setPagination(json.pagination ?? { total: 0, page: 1, pages: 1 })
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [entity, groupFilters, memberFilters])

  // Debounced auto-search on filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(1), 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [runSearch])

  // ── Filter helpers ───────────────────────────────────────────────────────

  const updateGroupFilter = useCallback(<K extends keyof GroupFilters>(k: K, v: GroupFilters[K]) => {
    setGroupFilters((p) => ({ ...p, [k]: v }))
  }, [])

  const updateMemberFilter = useCallback(<K extends keyof MemberFilters>(k: K, v: MemberFilters[K]) => {
    setMemberFilters((p) => ({ ...p, [k]: v }))
  }, [])

  const clearFilters = useCallback(() => {
    if (entity === 'groups') setGroupFilters(DEFAULT_GROUP_FILTERS)
    else setMemberFilters(DEFAULT_MEMBER_FILTERS)
  }, [entity])

  // ── Saved searches ───────────────────────────────────────────────────────

  const fetchSavedSearches = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API}/api/search/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setSavedSearches(json.data ?? [])
    } catch { /* non-fatal */ }
  }, [token])

  useEffect(() => { fetchSavedSearches() }, [fetchSavedSearches])

  const saveSearch = useCallback(async (name: string) => {
    if (!token) return
    const filters = entity === 'groups' ? groupFilters : memberFilters
    await fetch(`${API}/api/search/saved`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, entity, filters }),
    })
    await fetchSavedSearches()
  }, [token, entity, groupFilters, memberFilters, fetchSavedSearches])

  const deleteSavedSearch = useCallback(async (id: string) => {
    if (!token) return
    await fetch(`${API}/api/search/saved/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setSavedSearches((p) => p.filter((s) => s.id !== id))
  }, [token])

  const applySavedSearch = useCallback((s: SavedSearch) => {
    setEntity(s.entity)
    if (s.entity === 'groups') setGroupFilters(s.filters as GroupFilters)
    else setMemberFilters(s.filters as MemberFilters)
  }, [])

  return {
    entity, setEntity,
    groupFilters, updateGroupFilter,
    memberFilters, updateMemberFilter,
    clearFilters,
    results, pagination, loading,
    runSearch,
    savedSearches, saveSearch, deleteSavedSearch, applySavedSearch,
  }
}
