import { Request, Response } from 'express'
import { PaymentGatewayService } from '../services/paymentGatewayService'
import { PaymentGateway, RefundReason } from '../types/payment'
import { createModuleLogger } from '../utils/logger'

const logger = createModuleLogger('PaymentController')

const paymentGatewayService = new PaymentGatewayService()

export const paymentController = {
  /**
   * Create a new payment
   * POST /api/payments
   */
  async createPayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.walletAddress
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const {
        amount,
        currency,
        gateway,
        paymentMethodId,
        description,
        savePaymentMethod,
      } = req.body

      if (!amount || !currency || !gateway) {
        res.status(400).json({ error: 'Amount, currency, and gateway are required' })
        return
      }

      // Validate gateway
      if (!Object.values(PaymentGateway).includes(gateway)) {
        res.status(400).json({ error: `Invalid gateway. Must be one of: ${Object.values(PaymentGateway).join(', ')}` })
        return
      }

      const result = await paymentGatewayService.createPayment({
        userId,
        amount,
        currency: currency.toUpperCase(),
        gateway,
        paymentMethodId,
        description,
        metadata: {
          savePaymentMethod: savePaymentMethod || false,
        },
      })

      res.status(201).json({
        success: true,
        data: result,
      })
    } catch (error: any) {
      logger.error('Failed to create payment', { error: error.message })
      res.status(500).json({ error: error.message })
    }
  },

  /**
   * Get payment history
   * GET /api/payments
   */
  async getPaymentHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.walletAddress
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const limit = parseInt(req.query.limit as string) || 20
      const offset = parseInt(req.query.offset as string) || 0

      const payments = await paymentGatewayService.getPaymentHistory(userId, limit, offset)

      res.status(200).json({
        success: true,
        data: payments,
      })
    } catch (error: any) {
      logger.error('Failed to get payment history', { error: error.message })
      res.status(500).json({ error: error.message })
    }
  },

  /**
   * Get payment details
   * GET /api/payments/:id
   */
  async getPayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.walletAddress
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const { id } = req.params

      // You'd implement a getPaymentDetails method in the service
      // For now, this is a placeholder
      res.status(501).json({ error: 'Not implemented' })
    } catch (error: any) {
      logger.error('Failed to get payment', { error: error.message })
      res.status(500).json({ error: error.message })
    }
  },

  /**
   * Save a payment method
   * POST /api/payments/methods
   */
  async savePaymentMethod(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.walletAddress
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const { gateway, paymentMethodId, email, name } = req.body

      if (!gateway || !paymentMethodId) {
        res.status(400).json({ error: 'Gateway and paymentMethodId are required' })
        return
      }

      const result = await paymentGatewayService.savePaymentMethod(
        userId,
        gateway,
        paymentMethodId,
        email,
        name
      )

      res.status(201).json({
        success: true,
        data: result,
      })
    } catch (error: any) {
      logger.error('Failed to save payment method', { error: error.message })
      res.status(500).json({ error: error.message })
    }
  },

  /**
   * Get saved payment methods
   * GET /api/payments/methods
   */
  async getPaymentMethods(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.walletAddress
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const gateway = req.query.gateway as PaymentGateway | undefined

      const methods = await paymentGatewayService.getPaymentMethods(userId, gateway)

      res.status(200).json({
        success: true,
        data: methods,
      })
    } catch (error: any) {
      logger.error('Failed to get payment methods', { error: error.message })
      res.status(500).json({ error: error.message })
    }
  },

  /**
   * Delete a payment method
   * DELETE /api/payments/methods/:id
   */
  async deletePaymentMethod(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.walletAddress
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const { id } = req.params

      await paymentGatewayService.deletePaymentMethod(userId, id)

      res.status(200).json({
        success: true,
        message: 'Payment method deleted',
      })
    } catch (error: any) {
      logger.error('Failed to delete payment method', { error: error.message })
      res.status(500).json({ error: error.message })
    }
  },

  /**
   * Process a refund
   * POST /api/payments/:id/refund
   */
  async refundPayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.walletAddress
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const { id } = req.params
      const { amount, reason, description } = req.body

      if (!reason) {
        res.status(400).json({ error: 'Refund reason is required' })
        return
      }

      // Validate reason
      if (!Object.values(RefundReason).includes(reason)) {
        res.status(400).json({
          error: `Invalid reason. Must be one of: ${Object.values(RefundReason).join(', ')}`,
        })
        return
      }

      const result = await paymentGatewayService.processRefund({
        paymentId: id,
        amount,
        reason,
        description,
      })

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error: any) {
      logger.error('Failed to process refund', { error: error.message })
      res.status(500).json({ error: error.message })
    }
  },

  /**
   * Get exchange rate
   * GET /api/payments/exchange-rate?fiat=USD&crypto=XLM
   */
  async getExchangeRate(req: Request, res: Response): Promise<void> {
    try {
      const { fiat, crypto } = req.query

      if (!fiat || !crypto) {
        res.status(400).json({ error: 'fiat and crypto query parameters are required' })
        return
      }

      // Import the service
      const { FiatCryptoService } = await import('../services/fiatCryptoService')
      const fiatCryptoService = new FiatCryptoService()

      const rate = await fiatCryptoService.getExchangeRate(
        fiat as string,
        crypto as string
      )

      res.status(200).json({
        success: true,
        data: rate,
      })
    } catch (error: any) {
      logger.error('Failed to get exchange rate', { error: error.message })
      res.status(500).json({ error: error.message })
    }
  },
}
