import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { createServer } from 'http'
import * as Sentry from '@sentry/node'
import { initSentry } from './config/sentry.config'
import { initDatadog } from './config/datadog'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'
import { logger } from './utils/logger'
import { groupsRouter } from './routes/groups'
import { transactionsRouter } from './routes/transactions'
import { refundsRouter } from './routes/refunds'
import { healthRouter } from './routes/health'
import { webhooksRouter } from './routes/webhooks'
import { authRouter } from './routes/auth'
import { jobsRouter } from './routes/jobs'
import { searchRouter } from './routes/search'
import { setupSwagger } from './swagger'
import { apiLimiter, strictLimiter } from './middleware/rateLimiter'
import { compressionMiddleware } from './middleware/compression'
import { metricsMiddleware } from './middleware/metrics'
// Import queue and job modules
import { initializeQueues } from './queues'
import { startJobProcessors } from './jobs'
// Import chat service
import { chatService } from './services/chatService'
import { stopScheduler } from './cron/scheduler'
import { stopWorkers } from './jobs/jobWorkers'
import { healthMonitor } from './monitoring/healthMonitor'

dotenv.config()

// Init Sentry before anything else
initSentry()
// Init DataDog APM (no-op if DD_API_KEY not set)
initDatadog()

const app = express()
initSentry(app)
const PORT = process.env.PORT || 3001

// Create HTTP server
const server = createServer(app)

// Initialize Socket.IO with chat service
chatService.init(server)

// Middleware
app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173']
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  })
)
app.use(compressionMiddleware)

app.use(requestLogger)
app.use(metricsMiddleware)
app.set('trust proxy', 1)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api', apiLimiter)

// API Documentation - Swagger UI
setupSwagger(app)

// Routes
app.use('/health', healthRouter)
app.use('/api/auth', strictLimiter, authRouter)
app.use('/api/groups', groupsRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/refunds', refundsRouter)
app.use('/api/webhooks', strictLimiter, webhooksRouter)
app.use('/jobs', jobsRouter)
app.use('/api/search', searchRouter)

// Sentry error handler (must be before custom error handler)
app.use(Sentry.expressErrorHandler())

// Error handling
Sentry.setupExpressErrorHandler(app)
app.use(errorHandler)

// Initialize queues and workers
initializeQueues()
startJobProcessors()

// Start blockchain event listener
import { blockchainListener } from './services/blockchainListener'
blockchainListener.start()

// Start service health monitoring
healthMonitor.start()

// Start server
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, { env: process.env.NODE_ENV || 'development' })
  logger.info('Job queue system initialized and ready')
})

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...')
  if (server && server.close) {
    server.close((err?: Error) => {
      if (err) {
        logger.error('Error closing server', { error: err.message })
      } else {
        logger.info('HTTP server closed')
      }
    })
  }

  blockchainListener.stop()
  healthMonitor.stop()
  stopScheduler()
  await stopWorkers()
  setTimeout(() => process.exit(0), 100)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

export default app
