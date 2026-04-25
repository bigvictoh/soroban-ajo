import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'
import {
  PaymentGateway,
  PaymentStatus,
  RefundStatus,
  CreatePaymentIntent,
  PaymentResult,
  RefundResult,
} from '../types/payment'
import { createModuleLogger } from '../utils/logger'

const logger = createModuleLogger('StripeService')

const prisma = new PrismaClient()

export class StripeService {
  private stripe: Stripe
  private webhookSecret: string
  private defaultCurrency: string

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
    this.defaultCurrency = process.env.STRIPE_DEFAULT_CURRENCY || 'usd'

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required')
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia' as any,
    })
  }

  /**
   * Create a payment intent for processing
   */
  async createPaymentIntent(params: CreatePaymentIntent): Promise<PaymentResult> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency.toLowerCase(),
        payment_method: params.paymentMethodId,
        description: params.description || 'Fiat to Crypto Conversion',
        metadata: {
          userId: params.userId,
          gateway: PaymentGateway.STRIPE,
          ...params.metadata,
        },
        automatic_payment_methods: !params.paymentMethodId ? { enabled: true } : undefined,
        confirm: !!params.paymentMethodId,
      })

      logger.info('Stripe payment intent created', {
        paymentIntentId: paymentIntent.id,
        amount: params.amount,
        userId: params.userId,
      })

      return {
        paymentId: '', // Will be set by the unified service
        gatewayPaymentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret || undefined,
        status: this.mapStripeStatus(paymentIntent.status),
      }
    } catch (error: any) {
      logger.error('Failed to create Stripe payment intent', {
        error: error.message,
        userId: params.userId,
        amount: params.amount,
      })
      throw new Error(`Stripe payment failed: ${error.message}`)
    }
  }

  /**
   * Retrieve payment intent details
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.retrieve(paymentIntentId)
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.confirm(paymentIntentId)
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.cancel(paymentIntentId)
  }

  /**
   * Process a refund
   */
  async refundPayment(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<RefundResult> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason: reason as any,
      }

      if (amount) {
        refundParams.amount = amount
      }

      const refund = await this.stripe.refunds.create(refundParams)

      logger.info('Stripe refund created', {
        refundId: refund.id,
        paymentIntentId,
        amount: refund.amount,
      })

      return {
        refundId: '', // Will be set by the unified service
        gatewayRefundId: refund.id,
        status: this.mapRefundStatus(refund.status),
        amount: refund.amount,
      }
    } catch (error: any) {
      logger.error('Failed to create Stripe refund', {
        error: error.message,
        paymentIntentId,
      })
      throw new Error(`Stripe refund failed: ${error.message}`)
    }
  }

  /**
   * Create or retrieve a Stripe customer
   */
  async createCustomer(userId: string, email?: string, name?: string): Promise<string> {
    try {
      // Check if customer already exists
      const existingCustomers = await this.stripe.customers.list({
        email: email,
        limit: 1,
      })

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0].id
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
        },
      })

      logger.info('Stripe customer created', {
        customerId: customer.id,
        userId,
      })

      return customer.id
    } catch (error: any) {
      logger.error('Failed to create Stripe customer', {
        error: error.message,
        userId,
      })
      throw new Error(`Failed to create customer: ${error.message}`)
    }
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentMethod> {
    return await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    })
  }

  /**
   * Get customer's payment methods
   */
  async getCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })

    return paymentMethods.data
  }

  /**
   * Detach a payment method
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return await this.stripe.paymentMethods.detach(paymentMethodId)
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(payload: Buffer, signature: string): Promise<Stripe.Event> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      )

      logger.info('Stripe webhook event received', {
        eventType: event.type,
        eventId: event.id,
      })

      return event
    } catch (error: any) {
      logger.error('Stripe webhook verification failed', {
        error: error.message,
      })
      throw new Error(`Webhook verification failed: ${error.message}`)
    }
  }

  /**
   * Map Stripe payment status to our PaymentStatus
   */
  private mapStripeStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      requires_payment_method: PaymentStatus.PENDING,
      requires_confirmation: PaymentStatus.PENDING,
      requires_action: PaymentStatus.PENDING,
      processing: PaymentStatus.PROCESSING,
      succeeded: PaymentStatus.COMPLETED,
      canceled: PaymentStatus.CANCELLED,
      failed: PaymentStatus.FAILED,
    }

    return statusMap[status] || PaymentStatus.PENDING
  }

  /**
   * Map Stripe refund status to our RefundStatus
   */
  private mapRefundStatus(status: string): RefundStatus {
    const statusMap: Record<string, RefundStatus> = {
      pending: RefundStatus.PENDING,
      succeeded: RefundStatus.COMPLETED,
      failed: RefundStatus.FAILED,
      canceled: RefundStatus.FAILED,
    }

    return statusMap[status] || RefundStatus.PENDING
  }

  /**
   * Extract card details from payment method
   */
  extractCardDetails(paymentMethod: Stripe.PaymentMethod): {
    cardBrand?: string
    cardLast4?: string
    expiryMonth?: number
    expiryYear?: number
  } {
    if (paymentMethod.card) {
      return {
        cardBrand: paymentMethod.card.brand?.toUpperCase(),
        cardLast4: paymentMethod.card.last4,
        expiryMonth: paymentMethod.card.exp_month,
        expiryYear: paymentMethod.card.exp_year,
      }
    }

    return {}
  }
}
