'use client'

import React from 'react'
import Link from 'next/link'
import { Home, Compass, LayoutDashboard } from 'lucide-react'
import { ErrorLayout } from '@/components/error/ErrorLayout'
import { Button } from '@/components/Button'

export default function NotFound() {
  return (
    <ErrorLayout
      code="404"
      title="Lost in Space?"
      message="We couldn't find the page you're looking for. It might have moved, or perhaps it vanished into a black hole."
      icon={
        <div className="relative">
          <Compass className="w-24 h-24 stroke-1 animate-pulse" />
          <div className="absolute top-0 right-0 w-4 h-4 bg-primary-500 rounded-full animate-ping" />
        </div>
      }
    >
      <Link href="/">
        <Button variant="primary" size="lg" leftIcon={<Home className="w-5 h-5" />}>
          Back to Home
        </Button>
      </Link>
      <Link href="/dashboard">
        <Button variant="ghost" size="lg" leftIcon={<LayoutDashboard className="w-5 h-5" />}>
          Dashboard
        </Button>
      </Link>
    </ErrorLayout>
  )
}
