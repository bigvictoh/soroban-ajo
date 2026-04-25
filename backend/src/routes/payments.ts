import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { paymentController } from '../controllers/paymentController'
import {
  validatePaymentCreation,
  validateRefundRequest,
  validatePaymentMethodRequest,
} from '../middleware/paymentValidation'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// Payment creation and history
router.post('/', validatePaymentCreation, paymentController.createPayment)
router.get('/', paymentController.getPaymentHistory)
router.get('/:id', paymentController.getPayment)

// Payment methods management
router.post('/methods', validatePaymentMethodRequest, paymentController.savePaymentMethod)
router.get('/methods', paymentController.getPaymentMethods)
router.delete('/methods/:id', paymentController.deletePaymentMethod)

// Refunds
router.post('/:id/refund', validateRefundRequest, paymentController.refundPayment)

// Exchange rates
router.get('/exchange-rate', paymentController.getExchangeRate)

export const paymentsRouter = router
