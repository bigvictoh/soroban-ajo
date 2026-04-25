export enum PaymentGateway {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
}

export enum PaymentType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  REFUND = 'REFUND',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum RefundReason {
  DUPLICATE = 'DUPLICATE',
  FRAUD = 'FRAUD',
  REQUESTED_BY_CUSTOMER = 'REQUESTED_BY_CUSTOMER',
  PRODUCT_NOT_RECEIVED = 'PRODUCT_NOT_RECEIVED',
  DEFECTIVE = 'DEFECTIVE',
  OTHER = 'OTHER',
}

export interface PaymentGatewayConfig {
  stripe?: {
    secretKey: string
    publishableKey: string
    webhookSecret: string
    currency: string
  }
  paypal?: {
    clientId: string
    clientSecret: string
    webhookId: string
    environment: 'sandbox' | 'production'
    currency: string
  }
}

export interface CreatePaymentIntent {
  userId: string
  amount: number // in smallest currency unit (e.g., cents)
  currency: string
  gateway: PaymentGateway
  paymentMethodId?: string
  description?: string
  metadata?: Record<string, any>
}

export interface PaymentResult {
  paymentId: string
  gatewayPaymentId: string
  clientSecret?: string // For Stripe
  approvalUrl?: string // For PayPal
  status: PaymentStatus
}

export interface RefundPayment {
  paymentId: string
  amount?: number // Partial refund amount, omit for full refund
  reason: RefundReason
  description?: string
}

export interface RefundResult {
  refundId: string
  gatewayRefundId: string
  status: RefundStatus
  amount: number
}

export interface ExchangeRateResult {
  fiatCurrency: string
  cryptoCurrency: string
  rate: number
  source: string
  validUntil: Date
}

export interface PaymentMethodResult {
  id: string
  gateway: PaymentGateway
  cardBrand?: string
  cardLast4?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
}
