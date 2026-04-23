'use client'

import { useCallback } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useNotifications, type NotificationPayload } from '@/hooks/useNotifications'

/**
 * NotificationProvider
 *
 * Mounts the WebSocket connection for the /notifications namespace and
 * pipes incoming server-pushed notifications into the Zustand store.
 * Must be rendered inside AuthProvider so useAuthStore is available.
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const addNotification = useNotifications((s) => s.addNotification)

  const handleNotification = useCallback(
    (payload: NotificationPayload) => {
      addNotification(payload)
    },
    [addNotification]
  )

  useWebSocket({ onNotification: handleNotification })

  return <>{children}</>
}
