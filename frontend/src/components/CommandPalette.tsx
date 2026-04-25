import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import clsx from 'clsx'

export interface Command {
  id: string
  label: string
  description?: string
  category?: string
  icon?: React.ReactNode
  handler: () => void
  shortcut?: string
}

export interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  commands: Command[]
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query) return commands
    const q = query.toLowerCase()
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.category?.toLowerCase().includes(q),
    )
  }, [query, commands])

  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>()
    for (const cmd of filtered) {
      const cat = cmd.category ?? 'General'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(cmd)
    }
    return map
  }, [filtered])

  const handleSelect = useCallback(
    (cmd: Command) => {
      cmd.handler()
      onClose()
      setQuery('')
    },
    [onClose],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      setQuery('')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4" role="dialog" aria-modal="true">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <Search size={18} className="text-gray-400" aria-hidden="true" />
              <input
                autoFocus
                type="text"
                placeholder="Search commands..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className={clsx(
                  'flex-1 bg-transparent text-sm outline-none',
                  'text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500',
                )}
              />
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No commands found
                </div>
              ) : (
                Array.from(grouped.entries()).map(([category, cmds]) => (
                  <div key={category}>
                    <div className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {category}
                    </div>
                    <ul className="space-y-1 px-2 pb-2">
                      {cmds.map((cmd) => (
                        <li key={cmd.id}>
                          <button
                            onClick={() => handleSelect(cmd)}
                            className={clsx(
                              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left',
                              'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                              'focus:outline-none focus:ring-2 focus:ring-primary-500',
                            )}
                          >
                            {cmd.icon && <span className="flex-shrink-0">{cmd.icon}</span>}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {cmd.label}
                              </div>
                              {cmd.description && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {cmd.description}
                                </div>
                              )}
                            </div>
                            {cmd.shortcut && (
                              <div className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                                {cmd.shortcut}
                              </div>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Esc</kbd> to close
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
