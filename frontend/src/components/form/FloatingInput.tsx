'use client'

import { forwardRef } from 'react'
import { cn } from '@/utils/cnUtil'

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  success?: boolean
  icon?: React.ReactNode
}

export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, error, success, icon, className, id, name, ...props }, ref) => {
    // Derive a stable id from name if not provided
    const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, '-')
    const errorId = `${inputId}-error`

    return (
      <div className="w-full">
        <div className="relative group">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition" aria-hidden="true">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            name={name}
            placeholder=" "
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              'peer w-full rounded-xl border-2 bg-transparent px-4 py-3 text-gray-900 dark:text-white',
              'transition-all duration-300 outline-none',
              'border-gray-300 dark:border-gray-600',
              'focus:border-transparent focus:ring-2 focus:ring-purple-500',
              'placeholder-transparent',
              icon && 'pl-10',
              error && 'border-red-500 focus:ring-red-500',
              success && 'border-green-500 focus:ring-green-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className
            )}
            {...props}
          />

          <label
            htmlFor={inputId}
            className={cn(
              'absolute left-4 px-1 text-sm transition-all duration-300 pointer-events-none',
              'bg-white dark:bg-gray-900',
              // gray-500 meets WCAG AA 4.5:1 on white; gray-400 does not
              'text-gray-500 dark:text-gray-400',
              'peer-placeholder-shown:top-3 peer-placeholder-shown:text-base',
              'peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-purple-500',
              'peer-not-placeholder-shown:-top-2.5 peer-not-placeholder-shown:text-sm',
              icon && 'left-10',
              error && 'text-red-500',
              success && 'text-green-500'
            )}
          >
            {label}
          </label>
        </div>

        {error && (
          <p id={errorId} role="alert" className="mt-1 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    )
  }
)

FloatingInput.displayName = 'FloatingInput'
