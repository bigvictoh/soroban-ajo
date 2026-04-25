# Payment Gateway Integration Implementation

## Overview
This implementation adds comprehensive payment gateway integration supporting Stripe and PayPal for fiat-to-crypto onboarding in the Ajo platform.

## Features Implemented

### 1. **Payment Gateway Support**
- ✅ Stripe integration (Payment Intents API)
- ✅ PayPal integration (Checkout Orders API)
- ✅ Unified payment gateway service
- ✅ Webhook handlers for both gateways

### 2. **Fiat to Crypto Conversion**
- ✅ Real-time exchange rate fetching (CoinGecko API)
- ✅ Exchange rate caching (5-minute validity)
- ✅ Support for multiple fiat currencies (USD, EUR, GBP)
- ✅ Support for crypto currencies (XLM, USDC)
- ✅ Fallback rates for reliability

### 3. **Payment Processing**
- ✅ Create payment intents
- ✅ Save payment methods for future use
- ✅ Payment history tracking
- ✅ Payment status management (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, REFUNDED)
- ✅ Partial and full refund support

### 4. **Refund Handling**
- ✅ Process refunds through payment gateways
- ✅ Refund tracking and status management
- ✅ Refund reasons and metadata
- ✅ Integration with existing group-based refund system

### 5. **Payment Method Management**
- ✅ Save and retrieve payment methods
- ✅ Support for multiple payment methods per user
- ✅ Default payment method selection
- ✅ Secure payment method deletion

## Database Schema

### New Models Added to Prisma Schema:

1. **PaymentMethod** - Stores user payment methods
2. **Payment** - Tracks all payment transactions
3. **PaymentRefund** - Manages refund transactions
4. **ExchangeRate** - Caches fiat-to-crypto exchange rates

## Files Created/Modified

### Services
- `src/services/stripeService.ts` - Stripe API integration
- `src/services/paypalService.ts` - PayPal API integration
- `src/services/paymentGatewayService.ts` - Unified payment gateway orchestration
- `src/services/fiatCryptoService.ts` - Fiat-to-crypto conversion logic

### Controllers
- `src/controllers/paymentController.ts` - Payment API endpoints

### Routes
- `src/routes/payments.ts` - Payment API routes (authenticated)
- `src/routes/paymentWebhooks.ts` - Webhook handlers (unauthenticated, signature-verified)

### Middleware
- `src/middleware/paymentValidation.ts` - Request validation for payments

### Webhooks
- `src/webhooks/paymentWebhook.ts` - Stripe and PayPal webhook event handlers

### Types
- `src/types/payment.ts` - Payment-related TypeScript types and enums

### Configuration
- `prisma/schema.prisma` - Added payment models
- `.env.example` - Added payment gateway environment variables
- `package.json` - Added stripe and @stripe/stripe-js dependencies
- `src/index.ts` - Registered payment routes

## API Endpoints

### Payment Routes (`/api/payments`)

#### Create Payment
```
POST /api/payments
Body: {
  "amount": 10000, // in cents ($100.00)
  "currency": "USD",
  "gateway": "STRIPE", // or "PAYPAL"
  "paymentMethodId": "pm_xxx", // optional
  "description": "Deposit for crypto conversion"
}
Response: {
  "success": true,
  "data": {
    "paymentId": "xxx",
    "gatewayPaymentId": "pi_xxx",
    "clientSecret": "pi_xxx_secret_xxx", // Stripe only
    "approvalUrl": "https://paypal.com/...", // PayPal only
    "status": "PENDING"
  }
}
```

#### Get Payment History
```
GET /api/payments?limit=20&offset=0
Response: {
  "success": true,
  "data": [ ...payments ]
}
```

#### Save Payment Method
```
POST /api/payments/methods
Body: {
  "gateway": "STRIPE",
  "paymentMethodId": "pm_xxx",
  "email": "user@example.com",
  "name": "John Doe"
}
```

#### Get Payment Methods
```
GET /api/payments/methods?gateway=STRIPE
```

#### Delete Payment Method
```
DELETE /api/payments/methods/:id
```

#### Process Refund
```
POST /api/payments/:id/refund
Body: {
  "amount": 5000, // optional for partial refund
  "reason": "REQUESTED_BY_CUSTOMER",
  "description": "User requested refund"
}
```

#### Get Exchange Rate
```
GET /api/payments/exchange-rate?fiat=USD&crypto=XLM
Response: {
  "success": true,
  "data": {
    "fiatCurrency": "USD",
    "cryptoCurrency": "XLM",
    "rate": 8.33,
    "source": "COIN_GECKO",
    "validUntil": "2024-01-01T00:05:00.000Z"
  }
}
```

### Webhook Routes (`/api/webhooks/payments`)

#### Stripe Webhook
```
POST /api/webhooks/payments/stripe
Headers: {
  "stripe-signature": "t=xxx,v1=xxx"
}
Body: Raw Stripe event payload
```

#### PayPal Webhook
```
POST /api/webhooks/payments/paypal
Body: PayPal webhook event
```

## Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_DEFAULT_CURRENCY=usd

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_DEFAULT_CURRENCY=USD

# Optional: CoinGecko API (for higher rate limits)
COINGECKO_API_KEY=optional_api_key
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Run Database Migration
```bash
npx prisma migrate dev --name add_payment_gateway_integration
npx prisma generate
```

### 3. Configure Payment Gateways

#### Stripe Setup
1. Create a Stripe account at https://stripe.com
2. Get API keys from Stripe Dashboard
3. Configure webhook endpoint: `https://your-domain.com/api/webhooks/payments/stripe`
4. Subscribe to events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`

#### PayPal Setup
1. Create a PayPal Business account at https://paypal.com/business
2. Get API credentials from PayPal Developer Dashboard
3. Configure webhook endpoint: `https://your-domain.com/api/webhooks/payments/paypal`
4. Subscribe to events:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`

### 4. Start the Server
```bash
npm run dev
```

## Payment Flow

### Stripe Payment Flow
1. User initiates payment with amount and currency
2. Backend creates Stripe PaymentIntent
3. Client receives `clientSecret` and confirms payment with Stripe.js
4. Stripe processes payment and sends webhook
5. Backend receives webhook, updates payment status
6. Fiat-to-crypto conversion is triggered
7. User receives crypto in their wallet

### PayPal Payment Flow
1. User initiates payment with amount and currency
2. Backend creates PayPal Order
3. Client receives `approvalUrl` and redirects user to PayPal
4. User approves payment on PayPal
5. Backend captures the order
6. PayPal sends webhook confirmation
7. Backend updates payment status
8. Fiat-to-crypto conversion is triggered
9. User receives crypto in their wallet

## Security Considerations

1. **Webhook Verification**
   - Stripe: Signature verification using webhook secret
   - PayPal: Event verification through API

2. **Payment Method Security**
   - Card details never stored in database
   - Only tokenized payment method IDs stored
   - PCI compliance maintained through Stripe/PayPal

3. **Input Validation**
   - Amount limits (min/max per currency)
   - Currency format validation
   - Gateway validation
   - Reason validation for refunds

4. **Authentication**
   - All payment routes require authentication
   - Webhook routes use signature verification instead

## Error Handling

All endpoints return standardized error responses:
```json
{
  "error": "Descriptive error message"
}
```

Common errors:
- 400: Invalid input (amount, currency, gateway)
- 401: Unauthorized (missing/invalid auth token)
- 500: Internal server error

## Testing

### Manual Testing
1. Use Stripe test cards: https://stripe.com/docs/testing#cards
2. Use PayPal sandbox accounts: https://developer.paypal.com/docs/api-basics/sandbox/

### Test Scenarios
- Create payment with Stripe
- Create payment with PayPal
- Save and retrieve payment methods
- Process full refund
- Process partial refund
- Check exchange rates
- Handle webhook events

## Future Enhancements

1. **Additional Payment Methods**
   - Apple Pay / Google Pay
   - Bank transfers (ACH, SEPA)
   - Cryptocurrency payments

2. **Advanced Features**
   - Recurring payments / subscriptions
   - Installment plans
   - Multi-currency wallets
   - Payment analytics dashboard

3. **Compliance**
   - KYC integration for large transactions
   - AML checks
   - Tax reporting
   - PSD2/SCA compliance

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check webhook URL is publicly accessible
   - Verify webhook signature/secret is correct
   - Check server logs for errors

2. **Payment fails**
   - Verify API keys are correct
   - Check payment amount meets minimum requirements
   - Review gateway-specific error messages

3. **Exchange rate fetch fails**
   - Check internet connectivity
   - CoinGecko free tier has rate limits
   - Fallback rates will be used automatically

## Support

For issues or questions:
- Check implementation logs in `logs/` directory
- Review payment gateway documentation
- Contact development team
