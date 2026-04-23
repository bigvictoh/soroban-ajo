'use client'

import { useEffect, useState } from 'react'

const ANNOUNCE_EVENT = 'ajo:announce'

/**
 * Announce a message to screen readers via the mounted LiveRegion.
 * Safe to call from anywhere — toasts, form submissions, async actions.
 */
export function announce(message: string) {
  window.dispatchEvent(new CustomEvent(ANNOUNCE_EVENT, { detail: message }))
}

/**
 * Visually hidden live region. Mount once in the root layout.
 * Picks up announce() calls and surfaces them to screen readers.
 */
export function LiveRegion() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail
      // Clear first so re-announcing the same string still triggers a read
      setMessage('')
      requestAnimationFrame(() => setMessage(msg))
    }
    window.addEventListener(ANNOUNCE_EVENT, handler)
    return () => window.removeEventListener(ANNOUNCE_EVENT, handler)
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      // Visually hidden but readable by screen readers
      className="sr-only"
    >
      {message}
    </div>
  )
}
