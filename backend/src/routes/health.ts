import { Router } from 'express'
import { getMetrics } from '../middleware/rateLimitMetrics'

const router = Router()

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ajo-backend',
    version: '0.1.0',
    rateLimits: getMetrics(),
  })
})

export const healthRouter = router
