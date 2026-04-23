'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { FloatingInput } from './FloatingInput'

const STRENGTH_LABELS = ['', 'Weak', 'Medium', 'Strong'] as const

function getStrength(password: string): 1 | 2 | 3 {
  if (password.length < 6) return 1
  if (password.match(/[A-Z]/) && password.match(/[0-9]/)) return 3
  return 2
}

const strengthStyles: Record<number, string> = {
  1: 'w-1/3 bg-red-500',
  2: 'w-2/3 bg-yellow-500',
  3: 'w-full bg-green-500',
}

interface PasswordInputProps {
  id?: string
  name?: string
  label?: string
  error?: string
  [key: string]: unknown
}

export function PasswordInput({ id, name, label = 'Password', error, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false)
  const [value, setValue] = useState('')

  const strength = getStrength(value)
  const inputId = id ?? name ?? 'password'

  return (
    <div className="space-y-2">
      <div className="relative">
        <FloatingInput
          {...props}
          id={inputId}
          name={name}
          label={label}
          error={error}
          type={show ? 'text' : 'password'}
          onChange={(e) => setValue(e.target.value)}
        />

        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>

      {/* Strength bar */}
      <div
        role="img"
        aria-label={`Password strength: ${STRENGTH_LABELS[strength]}`}
        className="h-1 w-full rounded bg-gray-200 overflow-hidden"
      >
        <div className={`h-full transition-all duration-300 ${strengthStyles[strength]}`} />
      </div>
    </div>
  )
}
