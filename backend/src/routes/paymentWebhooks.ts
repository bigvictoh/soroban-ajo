import { Router, raw } from 'express'
import { paymentWebhookHandler } from '../webhooks/paymentWebhook'

const router = Router()

// Stripe webhook - needs raw body for signature verification
router.post(
  '/stripe',
  raw({ type: 'application/json' }),
  paymentWebhookHandler.handleStripeWebhook
)

// PayPal webhook
router.post('/paypal', paymentWebhookHandler.handlePayPalWebhook)

export const paymentWebhooksRouter = router
