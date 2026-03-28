/**
 * Frontend Performance Monitoring Utility
 * Tracks Core Web Vitals, page load times, component render times, and bundle size.
 */

export interface WebVitalsMetric {
  name: 'LCP' | 'FID' | 'CLS' | 'FCP' | 'TTFB' | 'INP'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  timestamp: number
}

export interface ComponentRenderMetric {
  componentName: string
  renderTime: number
  timestamp: number
}

export interface PageLoadMetric {
  url: string
  loadTime: number
  ttfb: number
  fcp: number
  domInteractive: number
  timestamp: number
}

// Web Vitals thresholds (Google's recommended values)
const THRESHOLDS = {
  LCP:  { good: 2500, poor: 4000 },
  FID:  { good: 100,  poor: 300 },
  CLS:  { good: 0.1,  poor: 0.25 },
  FCP:  { good: 1800, poor: 3000 },
  TTFB: { good: 800,  poor: 1800 },
  INP:  { good: 200,  poor: 500 },
}

// Performance budgets
export const PERFORMANCE_BUDGETS = {
  maxBundleSize: 500 * 1024,       // 500 KB
  maxApiResponseTime: 500,          // ms
  maxPageLoadTime: 3000,            // ms
  maxComponentRenderTime: 16,       // ms (one frame at 60fps)
}

function getRating(name: keyof typeof THRESHOLDS, value: number): WebVitalsMetric['rating'] {
  const t = THRESHOLDS[name]
  if (value <= t.good) return 'good'
  if (value <= t.poor) return 'needs-improvement'
  return 'poor'
}

function sendToBackend(type: string, data: unknown) {
  if (typeof window === 'undefined') return
  // Use sendBeacon for reliability during page unload
  const payload = JSON.stringify({ type, data, source: 'frontend-monitoring' })
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', new Blob([payload], { type: 'application/json' }))
  } else {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {/* silent */})
  }
}

function logBudgetViolation(metric: string, value: number, budget: number) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[Performance Budget] ${metric} exceeded: ${value.toFixed(2)} > ${budget}`)
  }
}

/**
 * Observe Core Web Vitals using PerformanceObserver.
 * Call once at app startup (e.g. in layout.tsx or providers.tsx).
 */
export function observeWebVitals(onMetric?: (metric: WebVitalsMetric) => void) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

  const report = (name: WebVitalsMetric['name'], value: number) => {
    const metric: WebVitalsMetric = {
      name,
      value,
      rating: getRating(name, value),
      timestamp: Date.now(),
    }
    sendToBackend('web_vital', metric)
    onMetric?.(metric)

    if (name === 'FCP' && value > PERFORMANCE_BUDGETS.maxPageLoadTime) {
      logBudgetViolation('FCP', value, PERFORMANCE_BUDGETS.maxPageLoadTime)
    }
  }

  // LCP
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number }
      report('LCP', last.startTime)
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  } catch { /* not supported */ }

  // FID
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { processingStart: number; startTime: number }
        report('FID', e.processingStart - e.startTime)
      }
    }).observe({ type: 'first-input', buffered: true })
  } catch { /* not supported */ }

  // CLS
  try {
    let clsValue = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
        if (!e.hadRecentInput) clsValue += e.value
      }
      report('CLS', clsValue)
    }).observe({ type: 'layout-shift', buffered: true })
  } catch { /* not supported */ }

  // FCP
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          report('FCP', entry.startTime)
        }
      }
    }).observe({ type: 'paint', buffered: true })
  } catch { /* not supported */ }

  // TTFB via navigation timing
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const nav = entry as PerformanceNavigationTiming
        report('TTFB', nav.responseStart - nav.requestStart)
      }
    }).observe({ type: 'navigation', buffered: true })
  } catch { /* not supported */ }

  // INP (Interaction to Next Paint)
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { duration: number }
        report('INP', e.duration)
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 40 } as PerformanceObserverInit)
  } catch { /* not supported */ }
}

/**
 * Measure page load timing from Navigation Timing API.
 */
export function measurePageLoad(): PageLoadMetric | null {
  if (typeof window === 'undefined') return null

  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  if (!nav) return null

  const metric: PageLoadMetric = {
    url: window.location.pathname,
    loadTime: nav.loadEventEnd - nav.fetchStart,
    ttfb: nav.responseStart - nav.requestStart,
    fcp: nav.domContentLoadedEventEnd - nav.fetchStart,
    domInteractive: nav.domInteractive - nav.fetchStart,
    timestamp: Date.now(),
  }

  if (metric.loadTime > PERFORMANCE_BUDGETS.maxPageLoadTime) {
    logBudgetViolation('Page Load', metric.loadTime, PERFORMANCE_BUDGETS.maxPageLoadTime)
  }

  sendToBackend('page_load', metric)
  return metric
}

/**
 * Measure a component's render time.
 * Usage: const end = startComponentMeasure('MyComponent'); ... end()
 */
export function startComponentMeasure(componentName: string): () => void {
  const start = performance.now()
  return () => {
    const renderTime = performance.now() - start
    const metric: ComponentRenderMetric = { componentName, renderTime, timestamp: Date.now() }

    if (renderTime > PERFORMANCE_BUDGETS.maxComponentRenderTime) {
      logBudgetViolation(`${componentName} render`, renderTime, PERFORMANCE_BUDGETS.maxComponentRenderTime)
    }

    sendToBackend('component_render', metric)
  }
}

/**
 * Measure an async operation (e.g. API call).
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = performance.now() - start

    if (duration > PERFORMANCE_BUDGETS.maxApiResponseTime) {
      logBudgetViolation(`API ${name}`, duration, PERFORMANCE_BUDGETS.maxApiResponseTime)
    }

    sendToBackend('api_call', { name, duration, status: 'success', timestamp: Date.now() })
    return result
  } catch (err) {
    const duration = performance.now() - start
    sendToBackend('api_call', { name, duration, status: 'error', timestamp: Date.now() })
    throw err
  }
}

/**
 * Report a resource timing entry (e.g. script/image load).
 * Useful for bundle size monitoring.
 */
export function observeResourceTiming() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const r = entry as PerformanceResourceTiming
        if (r.initiatorType === 'script' && r.transferSize > PERFORMANCE_BUDGETS.maxBundleSize) {
          logBudgetViolation(`Bundle ${r.name}`, r.transferSize, PERFORMANCE_BUDGETS.maxBundleSize)
          sendToBackend('bundle_size', {
            name: r.name,
            size: r.transferSize,
            duration: r.duration,
            timestamp: Date.now(),
          })
        }
      }
    }).observe({ type: 'resource', buffered: true })
  } catch { /* not supported */ }
}
