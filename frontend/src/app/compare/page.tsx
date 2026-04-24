'use client'

import React from 'react'
import { GroupComparison } from '@/components/GroupComparison'
import { useGroups } from '@/hooks/useContractData'

export default function ComparePage() {
  const { data: groups = [], isLoading } = useGroups()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full filter blur-3xl opacity-10" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-indigo-500 rounded-full filter blur-3xl opacity-10" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-20 text-white/40">Loading groups…</div>
        ) : (
          <GroupComparison availableGroups={groups} />
        )}
      </div>
    </div>
  )
}
