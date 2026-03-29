'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { ErrorLayout } from '@/components/error/ErrorLayout'
import { Button } from '@/components/Button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application Runtime Error:', error)
  }, [error])

  return (
    <ErrorLayout
      code="500"
      title="Houston, We Have a Problem"
      message="Something unexpected happened. Our engineers (and robots) are on it. Feel free to try again or return home."
      icon={<AlertTriangle className="w-24 h-24 stroke-1 text-red-500" />}
    >
      <Button
        variant="primary"
        size="lg"
        onClick={() => reset()}
        leftIcon={<RefreshCw className="w-5 h-5" />}
      >
        Try Again
      </Button>
      <Link href="/">
        <Button variant="ghost" size="lg" leftIcon={<Home className="w-5 h-5" />}>
          Go Home
        </Button>
      </Link>
    </ErrorLayout>
  )
}
