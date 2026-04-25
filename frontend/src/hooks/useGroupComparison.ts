'use client'

import { useState, useCallback } from 'react'
import { Group } from '@/types'

export const MAX_COMPARE = 4

export function useGroupComparison() {
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([])

  const addGroup = useCallback((group: Group) => {
    setSelectedGroups(prev => {
      if (prev.find(g => g.id === group.id) || prev.length >= MAX_COMPARE) return prev
      return [...prev, group]
    })
  }, [])

  const removeGroup = useCallback((groupId: string) => {
    setSelectedGroups(prev => prev.filter(g => g.id !== groupId))
  }, [])

  const clearAll = useCallback(() => setSelectedGroups([]), [])

  const canAdd = selectedGroups.length < MAX_COMPARE

  return { selectedGroups, addGroup, removeGroup, clearAll, canAdd, MAX_COMPARE }
}
