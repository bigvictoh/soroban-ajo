import React, { useState } from 'react'
import { Plus, X, Save } from 'lucide-react'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { FilterCriterion, FilterOperator } from '../hooks/useAdvancedFilters'

export interface FilterField {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'select'
  operators: FilterOperator[]
  options?: { label: string; value: any }[]
}

export interface FilterBuilderProps {
  fields: FilterField[]
  criteria: FilterCriterion[]
  presets: any[]
  onAddCriterion: (criterion: Omit<FilterCriterion, 'id'>) => void
  onRemoveCriterion: (id: string) => void
  onUpdateCriterion: (id: string, updates: Partial<FilterCriterion>) => void
  onClearAll: () => void
  onSavePreset: (name: string) => void
  onLoadPreset: (presetId: string) => void
  onDeletePreset: (presetId: string) => void
}

export const FilterBuilder: React.FC<FilterBuilderProps> = ({
  fields,
  criteria,
  presets,
  onAddCriterion,
  onRemoveCriterion,
  onUpdateCriterion,
  onClearAll,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}) => {
  const [showPresetName, setShowPresetName] = useState(false)
  const [presetName, setPresetName] = useState('')

  const handleSavePreset = () => {
    if (presetName.trim()) {
      onSavePreset(presetName)
      setPresetName('')
      setShowPresetName(false)
    }
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Presets */}
      {presets.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
            Saved Filters
          </label>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
              >
                <button
                  onClick={() => onLoadPreset(preset.id)}
                  className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {preset.name}
                </button>
                <button
                  onClick={() => onDeletePreset(preset.id)}
                  className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  aria-label="Delete preset"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active criteria */}
      <AnimatePresence>
        {criteria.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                Active Filters ({criteria.length})
              </label>
              <button
                onClick={onClearAll}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Clear all
              </button>
            </div>

            <div className="space-y-2">
              {criteria.map((criterion) => {
                const field = fields.find((f) => f.name === criterion.field)
                return (
                  <motion.div
                    key={criterion.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                  >
                    <select
                      value={criterion.field}
                      onChange={(e) => onUpdateCriterion(criterion.id, { field: e.target.value })}
                      className="text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {fields.map((f) => (
                        <option key={f.name} value={f.name}>
                          {f.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={criterion.operator}
                      onChange={(e) => onUpdateCriterion(criterion.id, { operator: e.target.value as FilterOperator })}
                      className="text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      {field?.operators.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>

                    {field?.type === 'select' && field.options ? (
                      <select
                        value={criterion.value}
                        onChange={(e) => onUpdateCriterion(criterion.id, { value: e.target.value })}
                        className="flex-1 text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Select...</option>
                        {field.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field?.type === 'date' ? 'date' : field?.type === 'number' ? 'number' : 'text'}
                        value={criterion.value}
                        onChange={(e) => onUpdateCriterion(criterion.id, { value: e.target.value })}
                        className="flex-1 text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Value"
                      />
                    )}

                    <button
                      onClick={() => onRemoveCriterion(criterion.id)}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      aria-label="Remove filter"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                )
              })}
            </div>

            {/* Save preset */}
            {!showPresetName ? (
              <button
                onClick={() => setShowPresetName(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <Save size={14} />
                Save as preset
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name..."
                  className="flex-1 text-sm px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSavePreset()
                    if (e.key === 'Escape') setShowPresetName(false)
                  }}
                />
                <button
                  onClick={handleSavePreset}
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Add criterion button */}
      <button
        onClick={() => onAddCriterion({ field: fields[0].name, operator: 'equals', value: '' })}
        className={clsx(
          'w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded transition-colors',
          criteria.length === 0
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
        )}
      >
        <Plus size={16} />
        Add filter
      </button>
    </div>
  )
}
