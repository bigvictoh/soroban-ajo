import {
  PaymentGateway,
  PaymentStatus,
  RefundStatus,
  CreatePaymentIntent,
  PaymentResult,
  RefundResult,
} from '../types/payment'
import { createModuleLogger } from '../utils/logger'

const logger = createModuleLogger('PayPalService')

interface PayPalAccessToken {
  access_token: string
  token_type: string
  expires_in: number
}

interface PayPalOrder {
  id: string
  status: string
  links: Array<{ href: string; rel: string; method: string }>
  purchase_units: Array<{
    amount: {
      currency_code: string
      value: string
    }
  }>
}

interface PayPalRefund {
  id: string
  status: string
  amount: {
    currency_code: string
    value: string
  }
}

export class PayPalService {
  private clientId: string
  private clientSecret: string
  private environment: 'sandbox' | 'production'
  private defaultCurrency: string
  private baseUrl: string
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID || ''
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || ''
    this.environment = (process.env.PAYPAL_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
    this.defaultCurrency = process.env.PAYPAL_DEFAULT_CURRENCY || 'USD'

    if (!this.clientId || !this.clientSecret) {
      throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables are required')
    }

    this.baseUrl = this.environment === 'sandbox'
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com'
  }

  /**
   * Get PayPal access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken
    }

    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')

      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: 'grant_type=client_credentials',
      })

      if (!response.ok) {
        throw new Error(`Failed to get PayPal access token: ${response.statusText}`)
      }

      const data: PayPalAccessToken = await response.json()
      this.accessToken = data.access_token
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000) // 60s buffer

      logger.info('PayPal access token obtained')

      return this.accessToken!
    } catch (error: any) {
      logger.error('Failed to get PayPal access token', { error: error.message })
      throw new Error(`PayPal authentication failed: ${error.message}`)
    }
  }

  /**
   * Create an order for payment
   */
  async createOrder(params: CreatePaymentIntent): Promise<PaymentResult> {
    try {
      const token = await this.getAccessToken()
      const amountInDollars = (params.amount / 100).toFixed(2) // Convert cents to dollars

      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: params.currency.toUpperCase(),
              value: amountInDollars,
            },
            description: params.description || 'Fiat to Crypto Conversion',
            custom_id: params.userId,
          },
        ],
        application_context: {
          return_url: `${process.env.FRONTEND_URL}/payment/success`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
          brand_name: 'Ajo',
          user_action: 'PAY_NOW',
        },
      }

      const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`PayPal order creation failed: ${error.message}`)
      }

      const order: PayPalOrder = await response.json()
      const approvalUrl = order.links.find(link => link.rel === 'approve')?.href

      logger.info('PayPal order created', {
        orderId: order.id,
        amount: params.amount,
        userId: params.userId,
      })

      return {
        paymentId: '', // Will be set by the unified service
        gatewayPaymentId: order.id,
        approvalUrl,
        status: PaymentStatus.PENDING,
      }
    } catch (error: any) {
      logger.error('Failed to create PayPal order', {
        error: error.message,
        userId: params.userId,
        amount: params.amount,
      })
      throw new Error(`PayPal payment failed: ${error.message}`)
    }
  }

  /**
   * Capture (complete) an order after user approval
   */
  async captureOrder(orderId: string): Promise<PayPalOrder> {
    try {
      const token = await this.getAccessToken()

      const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`PayPal order capture failed: ${error.message}`)
      }

      const order: PayPalOrder = await response.json()

      logger.info('PayPal order captured', {
        orderId,
        status: order.status,
      })

      return order
    } catch (error: any) {
      logger.error('Failed to capture PayPal order', {
        error: error.message,
        orderId,
      })
      throw new Error(`PayPal order capture failed: ${error.message}`)
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<PayPalOrder> {
    try {
      const token = await this.getAccessToken()

      const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get PayPal order: ${response.statusText}`)
      }

      return await response.json()
    } catch (error: any) {
      logger.error('Failed to get PayPal order', {
        error: error.message,
        orderId,
      })
      throw new Error(`Failed to retrieve PayPal order: ${error.message}`)
    }
  }

  /**
   * Process a refund
   */
  async refundPayment(
    captureId: string,
    amount?: number,
    reason?: string
  ): Promise<RefundResult> {
    try {
      const token = await this.getAccessToken()
      const currency = this.defaultCurrency

      const refundData: any = {
        reason: reason || 'REQUESTED_BY_CUSTOMER',
      }

      if (amount) {
        const amountInDollars = (amount / 100).toFixed(2)
        refundData.amount = {
          currency_code: currency,
          value: amountInDollars,
        }
      }

      const response = await fetch(`${this.baseUrl}/v2/payments/captures/${captureId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(refundData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`PayPal refund failed: ${error.message}`)
      }

      const refund: PayPalRefund = await response.json()
      const refundAmount = Math.round(parseFloat(refund.amount.value) * 100)

      logger.info('PayPal refund created', {
        refundId: refund.id,
        captureId,
        amount: refundAmount,
      })

      return {
        refundId: '', // Will be set by the unified service
        gatewayRefundId: refund.id,
        status: this.mapRefundStatus(refund.status),
        amount: refundAmount,
      }
    } catch (error: any) {
      logger.error('Failed to create PayPal refund', {
        error: error.message,
        captureId,
      })
      throw new Error(`PayPal refund failed: ${error.message}`)
    }
  }

  /**
   * Verify webhook event
   */
  async verifyWebhook(eventId: string, expectedEvent: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken()

      const response = await fetch(`${this.baseUrl}/v1/notifications/webhooks-events/${eventId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        return false
      }

      const eventData = await response.json()
      return eventData.event_type === expectedEvent
    } catch (error: any) {
      logger.error('Failed to verify PayPal webhook', {
        error: error.message,
        eventId,
      })
      return false
    }
  }

  /**
   * Map PayPal status to our PaymentStatus
   */
  private mapPayPalStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      CREATED: PaymentStatus.PENDING,
      SAVED: PaymentStatus.PENDING,
      APPROVED: PaymentStatus.PROCESSING,
      VOIDED: PaymentStatus.CANCELLED,
      COMPLETED: PaymentStatus.COMPLETED,
      PAYER_ACTION_REQUIRED: PaymentStatus.PENDING,
    }

    return statusMap[status] || PaymentStatus.PENDING
  }

  /**
   * Map PayPal refund status to our RefundStatus
   */
  private mapRefundStatus(status: string): RefundStatus {
    const statusMap: Record<string, RefundStatus> = {
      pending: RefundStatus.PENDING,
      completed: RefundStatus.COMPLETED,
      failed: RefundStatus.FAILED,
      cancelled: RefundStatus.FAILED,
    }

    return statusMap[status] || RefundStatus.PENDING
  }
}
