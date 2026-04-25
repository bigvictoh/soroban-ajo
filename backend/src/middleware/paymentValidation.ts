import { Request, Response, NextFunction } from 'express'
import { createModuleLogger } from '../utils/logger'

const logger = createModuleLogger('PaymentValidationMiddleware')

/**
 * Validate payment creation request
 */
export const validatePaymentCreation = (req: Request, res: Response, next: NextFunction): void => {
  const { amount, currency, gateway } = req.body

  // Validate amount
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    res.status(400).json({
      error: 'Invalid amount. Must be a positive number in smallest currency unit (e.g., cents)',
    })
    return
  }

  // Validate currency
  if (!currency || typeof currency !== 'string') {
    res.status(400).json({
      error: 'Invalid currency. Must be a valid ISO 4217 currency code (e.g., USD, EUR)',
    })
    return
  }

  // Validate currency format (3-letter code)
  if (!/^[A-Z]{3}$/i.test(currency)) {
    res.status(400).json({
      error: 'Invalid currency format. Must be a 3-letter ISO 4217 code',
    })
    return
  }

  // Validate gateway
  const validGateways = ['STRIPE', 'PAYPAL']
  if (!gateway || !validGateways.includes(gateway.toUpperCase())) {
    res.status(400).json({
      error: `Invalid gateway. Must be one of: ${validGateways.join(', ')}`,
    })
    return
  }

  // Validate minimum amount (e.g., $1.00 = 100 cents)
  const minAmounts: Record<string, number> = {
    USD: 100,
    EUR: 100,
    GBP: 100,
  }

  const currencyUpper = currency.toUpperCase()
  if (minAmounts[currencyUpper] && amount < minAmounts[currencyUpper]) {
    res.status(400).json({
      error: `Minimum amount for ${currencyUpper} is ${(minAmounts[currencyUpper] / 100).toFixed(2)}`,
    })
    return
  }

  // Validate maximum amount (e.g., $10,000.00 = 1,000,000 cents)
  const maxAmounts: Record<string, number> = {
    USD: 1000000,
    EUR: 1000000,
    GBP: 1000000,
  }

  if (maxAmounts[currencyUpper] && amount > maxAmounts[currencyUpper]) {
    res.status(400).json({
      error: `Maximum amount for ${currencyUpper} is ${(maxAmounts[currencyUpper] / 100).toFixed(2)}`,
    })
    return
  }

  next()
}

/**
 * Validate refund request
 */
export const validateRefundRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { amount, reason } = req.body

  // Validate reason
  const validReasons = [
    'DUPLICATE',
    'FRAUD',
    'REQUESTED_BY_CUSTOMER',
    'PRODUCT_NOT_RECEIVED',
    'DEFECTIVE',
    'OTHER',
  ]

  if (!reason || !validReasons.includes(reason)) {
    res.status(400).json({
      error: `Invalid refund reason. Must be one of: ${validReasons.join(', ')}`,
    })
    return
  }

  // Validate amount if provided (for partial refunds)
  if (amount !== undefined) {
    if (typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({
        error: 'Invalid refund amount. Must be a positive number',
      })
      return
    }
  }

  next()
}

/**
 * Validate payment method request
 */
export const validatePaymentMethodRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { gateway, paymentMethodId } = req.body

  // Validate gateway
  const validGateways = ['STRIPE', 'PAYPAL']
  if (!gateway || !validGateways.includes(gateway.toUpperCase())) {
    res.status(400).json({
      error: `Invalid gateway. Must be one of: ${validGateways.join(', ')}`,
    })
    return
  }

  // Validate paymentMethodId
  if (!paymentMethodId || typeof paymentMethodId !== 'string') {
    res.status(400).json({
      error: 'Invalid paymentMethodId. Must be a valid payment method identifier',
    })
    return
  }

  next()
}
