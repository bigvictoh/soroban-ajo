#!/bin/bash

# Payment Gateway Integration Setup Script
# This script helps you set up the payment gateway integration

echo "========================================="
echo "Payment Gateway Integration Setup"
echo "========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Please run this script from the backend directory"
    exit 1
fi

echo "Step 1: Installing dependencies..."
npm install
echo ""

echo "Step 2: Generating Prisma client..."
npx prisma generate
echo ""

echo "Step 3: Creating database migration..."
echo "This will create the payment tables in your database."
read -p "Do you want to proceed? (y/n): " confirm
if [ "$confirm" = "y" ]; then
    npx prisma migrate dev --name add_payment_gateway_integration
    echo ""
    echo "Migration completed successfully!"
else
    echo "Migration skipped. You can run it manually later with:"
    echo "  npx prisma migrate dev --name add_payment_gateway_integration"
fi
echo ""

echo "Step 4: Setup environment variables"
echo "Please add the following to your .env file:"
echo ""
echo "# Payment Gateway - Stripe"
echo "STRIPE_SECRET_KEY=sk_test_your_key_here"
echo "STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here"
echo "STRIPE_WEBHOOK_SECRET=whsec_your_secret_here"
echo "STRIPE_DEFAULT_CURRENCY=usd"
echo ""
echo "# Payment Gateway - PayPal"
echo "PAYPAL_CLIENT_ID=your_paypal_client_id"
echo "PAYPAL_CLIENT_SECRET=your_paypal_client_secret"
echo "PAYPAL_WEBHOOK_ID=your_paypal_webhook_id"
echo "PAYPAL_ENVIRONMENT=sandbox"
echo "PAYPAL_DEFAULT_CURRENCY=USD"
echo ""

echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Configure your .env file with payment gateway credentials"
echo "2. Set up webhooks in Stripe and PayPal dashboards"
echo "3. Start the server: npm run dev"
echo "4. Test the payment endpoints"
echo ""
echo "For detailed documentation, see: PAYMENT_GATEWAY_INTEGRATION.md"
echo ""
