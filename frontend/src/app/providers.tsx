'use client'

import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useOnboarding } from '@/hooks/useOnboarding'

function OnboardingInitializer() {
  const startOnboardingIfNew = useOnboarding((s) => s.startOnboardingIfNew)
  useEffect(() => {
    startOnboardingIfNew()
  }, [startOnboardingIfNew])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Init third-party monitoring tools
    initSentryClient()
    initGoogleAnalytics()

    // Observe Core Web Vitals — forward to GA4 as well
    observeWebVitals((metric) => {
      trackWebVital(metric.name, metric.value, metric.rating)
    })

    observeResourceTiming()

    if (document.readyState === 'complete') {
      measurePageLoad()
    } else {
      window.addEventListener('load', measurePageLoad, { once: true })
    }
  }, [])

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <OnboardingInitializer />
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
