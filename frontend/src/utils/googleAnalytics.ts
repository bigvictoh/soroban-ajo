/**
 * Google Analytics 4 (GA4) integration.
 * No-op if NEXT_PUBLIC_GA_MEASUREMENT_ID is not set.
 */

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
    dataLayer: unknown[]
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export function isGAEnabled(): boolean {
  return typeof window !== 'undefined' && !!GA_ID && typeof window.gtag === 'function'
}

/**
 * Inject the GA4 script tags into the document head.
 * Call once at app startup.
 */
export function initGoogleAnalytics() {
  if (typeof window === 'undefined' || !GA_ID) return

  // Avoid double-injection
  if (document.getElementById('ga-script')) return

  window.dataLayer = window.dataLayer || []
  window.gtag = function (...args: unknown[]) {
    window.dataLayer.push(args)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, {
    // Anonymize IP for privacy compliance
    anonymize_ip: true,
    // Don't send page views automatically — we control them
    send_page_view: false,
  })

  const script = document.createElement('script')
  script.id = 'ga-script'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)
}

/**
 * Track a page view. Call on route changes.
 */
export function trackPageView(url: string, title?: string) {
  if (!isGAEnabled()) return
  window.gtag('event', 'page_view', {
    page_location: url,
    page_title: title || document.title,
  })
}

/**
 * Track a custom event.
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
) {
  if (!isGAEnabled()) return
  window.gtag('event', eventName, params)
}

/**
 * Track a Web Vitals metric as a GA4 event.
 * Integrates with the monitoring.ts observeWebVitals callback.
 */
export function trackWebVital(name: string, value: number, rating: string) {
  if (!isGAEnabled()) return
  window.gtag('event', 'web_vitals', {
    metric_name: name,
    metric_value: Math.round(name === 'CLS' ? value * 1000 : value),
    metric_rating: rating,
    non_interaction: true,
  })
}
