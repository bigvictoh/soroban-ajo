'use client'

import { useRef } from 'react'
import { cn } from '@/utils/cnUtil'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export function Textarea({ label, error, id, name, className, ...props }: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const textareaId = id ?? name ?? label.toLowerCase().replace(/\s+/g, '-')
  const errorId = `${textareaId}-error`

  const handleInput = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        id={textareaId}
        name={name}
        onInput={handleInput}
        placeholder=" "
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'peer w-full resize-none rounded-xl border-2 border-gray-300 bg-transparent px-4 py-3 outline-none',
          'focus:ring-2 focus:ring-purple-500 focus:border-transparent',
          'text-gray-900 dark:text-white',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />

      <label
        htmlFor={textareaId}
        className={cn(
          'absolute left-4 top-3 px-1 pointer-events-none transition-all duration-300',
          // gray-500 meets WCAG AA 4.5:1 on white; gray-400 does not
          'text-gray-500 dark:text-gray-400',
          'peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-purple-500',
          'peer-placeholder-shown:top-3 peer-placeholder-shown:text-base',
          'peer-not-placeholder-shown:-top-2.5 peer-not-placeholder-shown:text-sm',
          'bg-white dark:bg-gray-900',
          error && 'text-red-500'
        )}
      >
        {label}
      </label>

      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}
