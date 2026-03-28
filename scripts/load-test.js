/**
 * Load Testing Script using k6
 * Run with: k6 run scripts/load-test.js
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 *
 * Scenarios:
 *   - load:   Sustained load test (ramp up → steady → ramp down)
 *   - stress: Stress test (push beyond normal capacity)
 *   - spike:  Spike test (sudden traffic surge)
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('error_rate')
const apiDuration = new Trend('api_duration', true)
const requestCount = new Counter('request_count')

// Performance budgets (must match backend/src/middleware/performance.ts)
const BUDGETS = {
  apiResponseTime: 500,   // ms p95
  errorRate: 0.01,        // 1%
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001'

export const options = {
  scenarios: {
    // Scenario 1: Load test — normal expected traffic
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },   // ramp up
        { duration: '1m',  target: 20 },   // steady state
        { duration: '30s', target: 0 },    // ramp down
      ],
      gracefulRampDown: '10s',
      tags: { scenario: 'load' },
    },

    // Scenario 2: Stress test — beyond normal capacity
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m',  target: 100 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
      tags: { scenario: 'stress' },
      startTime: '3m', // run after load test
    },

    // Scenario 3: Spike test — sudden burst
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5 },    // baseline
        { duration: '10s', target: 200 },  // spike
        { duration: '30s', target: 200 },  // hold spike
        { duration: '10s', target: 5 },    // recover
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
      tags: { scenario: 'spike' },
      startTime: '6m', // run after stress test
    },
  },

  thresholds: {
    // Enforce performance budgets
    http_req_duration: [
      `p(95)<${BUDGETS.apiResponseTime}`,
      `p(99)<${BUDGETS.apiResponseTime * 2}`,
    ],
    error_rate: [`rate<${BUDGETS.errorRate}`],
    http_req_failed: [`rate<${BUDGETS.errorRate}`],
  },
}

// Shared headers
const headers = { 'Content-Type': 'application/json' }

export default function () {
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`, { tags: { endpoint: 'health' } })
  check(healthRes, {
    'health: status 200': (r) => r.status === 200,
    'health: response time < 200ms': (r) => r.timings.duration < 200,
  })
  errorRate.add(healthRes.status !== 200)
  apiDuration.add(healthRes.timings.duration, { endpoint: 'health' })
  requestCount.add(1)

  sleep(0.5)

  // Groups list
  const groupsRes = http.get(`${BASE_URL}/api/groups`, { headers, tags: { endpoint: 'groups' } })
  check(groupsRes, {
    'groups: status 200 or 401': (r) => r.status === 200 || r.status === 401,
    'groups: response time < 500ms': (r) => r.timings.duration < BUDGETS.apiResponseTime,
  })
  errorRate.add(groupsRes.status >= 500)
  apiDuration.add(groupsRes.timings.duration, { endpoint: 'groups' })
  requestCount.add(1)

  sleep(0.5)

  // Metrics endpoint
  const metricsRes = http.get(`${BASE_URL}/api/metrics`, { headers, tags: { endpoint: 'metrics' } })
  check(metricsRes, {
    'metrics: status 200': (r) => r.status === 200,
    'metrics: has data': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.success === true && body.data !== undefined
      } catch {
        return false
      }
    },
  })
  errorRate.add(metricsRes.status >= 500)
  apiDuration.add(metricsRes.timings.duration, { endpoint: 'metrics' })
  requestCount.add(1)

  sleep(1)
}

export function handleSummary(data) {
  const passed = data.metrics.http_req_duration.values['p(95)'] < BUDGETS.apiResponseTime
  const errorRateOk = (data.metrics.http_req_failed?.values?.rate || 0) < BUDGETS.errorRate

  const summary = {
    timestamp: new Date().toISOString(),
    passed: passed && errorRateOk,
    budgets: {
      apiResponseTime: {
        budget: BUDGETS.apiResponseTime,
        p95: data.metrics.http_req_duration.values['p(95)'],
        p99: data.metrics.http_req_duration.values['p(99)'],
        passed,
      },
      errorRate: {
        budget: BUDGETS.errorRate,
        actual: data.metrics.http_req_failed?.values?.rate || 0,
        passed: errorRateOk,
      },
    },
    requests: {
      total: data.metrics.http_reqs?.values?.count || 0,
      failed: data.metrics.http_req_failed?.values?.count || 0,
    },
  }

  // Summary printed via stdout return value below

  return {
    'stdout': JSON.stringify(summary, null, 2),
    'scripts/load-test-results.json': JSON.stringify(summary, null, 2),
  }
}
