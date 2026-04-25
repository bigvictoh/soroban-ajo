import { useCallback, useEffect, useState } from 'react'
import { ShortcutDefinition } from './useKeyboardShortcuts'

const STORAGE_KEY = 'ajo_shortcuts_custom'

export interface ShortcutBinding {
  id: string
  key: string
  modifiers: string[]
}

export interface UseShortcutCustomizationReturn {
  customBindings: Map<string, ShortcutBinding>
  updateBinding: (id: string, binding: ShortcutBinding) => void
  resetBinding: (id: string) => void
  resetAll: () => void
  hasConflict: (binding: ShortcutBinding, excludeId?: string) => boolean
}

export function useShortcutCustomization(): UseShortcutCustomizationReturn {
  const [customBindings, setCustomBindings] = useState<Map<string, ShortcutBinding>>(new Map())

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setCustomBindings(new Map(Object.entries(data)))
      } catch {
        // Ignore parse errors
      }
    }
  }, [])

  const updateBinding = useCallback((id: string, binding: ShortcutBinding) => {
    setCustomBindings((prev) => {
      const next = new Map(prev)
      next.set(id, binding)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(next)))
      return next
    })
  }, [])

  const resetBinding = useCallback((id: string) => {
    setCustomBindings((prev) => {
      const next = new Map(prev)
      next.delete(id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(next)))
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    setCustomBindings(new Map())
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const hasConflict = useCallback(
    (binding: ShortcutBinding, excludeId?: string): boolean => {
      for (const [id, existing] of customBindings) {
        if (excludeId && id === excludeId) continue
        if (
          existing.key === binding.key &&
          existing.modifiers.sort().join(',') === binding.modifiers.sort().join(',')
        ) {
          return true
        }
      }
      return false
    },
    [customBindings],
  )

  return { customBindings, updateBinding, resetBinding, resetAll, hasConflict }
}
