'use client'

import React, { useState, useEffect } from 'react'
import { Bell, Trash2, CheckCheck, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { useWebSocket } from '@/hooks/useWebSocket'
import { NoNotifications } from './empty/NoNotifications'
import NotificationItem from './NotificationItem'

export default function NotificationCenter() {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    getUnreadCount,
    addNotification,
    requestBrowserPermission,
  } = useNotifications()

  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default')

  // Wire up real-time WebSocket
  const { status: wsStatus, isConnected, markRead } = useWebSocket({
    onNotification: (payload) => {
      addNotification(payload)
    },
  })

  // Sync browser permission state
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission)
    }
  }, [])

  const handleRequestPermission = async () => {
    const result = await requestBrowserPermission()
    setPermissionStatus(result)
  }

  const handleMarkAsRead = (id: string) => {
    markAsRead(id)
    markRead(id)
  }

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications

  const unreadCount = getUnreadCount()

  const wsStatusLabel: Record<typeof wsStatus, string> = {
    connected: 'Live',
    connecting: 'Connecting…',
    disconnected: 'Offline',
    error: 'Connection error',
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Stay updated with your savings groups
            </p>
          </div>

          {/* WebSocket status badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              isConnected
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : wsStatus === 'connecting'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {isConnected ? (
              <Wifi className="w-3 h-3" />
            ) : wsStatus === 'connecting' ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            {wsStatusLabel[wsStatus]}
          </div>
        </div>

        {/* Browser notification permission banner */}
        {permissionStatus === 'default' && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <Bell className="w-4 h-4 shrink-0" />
              Enable browser notifications to get alerts even when the tab is in the background.
            </div>
            <button
              onClick={handleRequestPermission}
              className="ml-4 shrink-0 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Enable
            </button>
          </div>
        )}

        {/* Actions Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all as read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <NoNotifications />
          ) : (
            <div>
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
