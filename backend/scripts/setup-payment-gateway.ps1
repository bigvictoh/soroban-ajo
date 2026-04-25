# Payment Gateway Integration Setup Script (PowerShell)
# This script helps you set up the payment gateway integration

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Payment Gateway Integration Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-Not (Test-Path "package.json")) {
    Write-Host "Error: Please run this script from the backend directory" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Installing dependencies..." -ForegroundColor Yellow
npm install
Write-Host ""

Write-Host "Step 2: Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
Write-Host ""

Write-Host "Step 3: Creating database migration..." -ForegroundColor Yellow
Write-Host "This will create the payment tables in your database."
$confirm = Read-Host "Do you want to proceed? (y/n)"
if ($confirm -eq "y") {
    npx prisma migrate dev --name add_payment_gateway_integration
    Write-Host ""
    Write-Host "Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Migration skipped. You can run it manually later with:" -ForegroundColor Yellow
    Write-Host "  npx prisma migrate dev --name add_payment_gateway_integration"
}
Write-Host ""

Write-Host "Step 4: Setup environment variables" -ForegroundColor Yellow
Write-Host "Please add the following to your .env file:"
Write-Host ""
Write-Host "# Payment Gateway - Stripe"
Write-Host "STRIPE_SECRET_KEY=sk_test_your_key_here"
Write-Host "STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here"
Write-Host "STRIPE_WEBHOOK_SECRET=whsec_your_secret_here"
Write-Host "STRIPE_DEFAULT_CURRENCY=usd"
Write-Host ""
Write-Host "# Payment Gateway - PayPal"
Write-Host "PAYPAL_CLIENT_ID=your_paypal_client_id"
Write-Host "PAYPAL_CLIENT_SECRET=your_paypal_client_secret"
Write-Host "PAYPAL_WEBHOOK_ID=your_paypal_webhook_id"
Write-Host "PAYPAL_ENVIRONMENT=sandbox"
Write-Host "PAYPAL_DEFAULT_CURRENCY=USD"
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure your .env file with payment gateway credentials"
Write-Host "2. Set up webhooks in Stripe and PayPal dashboards"
Write-Host "3. Start the server: npm run dev"
Write-Host "4. Test the payment endpoints"
Write-Host ""
Write-Host "For detailed documentation, see: PAYMENT_GATEWAY_INTEGRATION.md"
Write-Host ""
