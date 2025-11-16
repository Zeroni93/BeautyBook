# Payment Integration Guide

## Stripe Configuration

### Webhook Endpoints

The application listens for Stripe webhooks at the following endpoint:
- **Local Development**: `http://localhost:3000/api/webhooks/stripe`
- **Production**: `https://your-domain.com/api/webhooks/stripe`

### Current Development Setup

For local development, we use ngrok to expose the local webhook endpoint:

**Webhook URL in Stripe Dashboard:**
```
https://7c4c-2600-1700-5861-3470-a07f-6c71-7c1f-eb2e.ngrok-free.app/api/webhooks/stripe
```

**Webhook Signing Secret:**
```
whsec_GLb8eb3pGct69ECuQiALK1JBibXLE5rd
```

> **Note**: The application always serves webhooks at `/api/webhooks/stripe`. The ngrok URL is only used by Stripe to reach your local development server. In production, use your actual domain.

### Webhook Events Handled

The application processes the following Stripe events:

1. **`checkout.session.completed`**
   - Handles successful booking payments
   - Updates booking status to 'confirmed'
   - Creates payment records
   - Processes provider subscription payments

2. **`payment_intent.succeeded`**
   - Confirms payment completion
   - Updates payment status in database

3. **`charge.refunded`**
   - Processes refunds
   - Updates booking and payment status
   - Handles partial and full refunds

4. **`account.updated`**
   - Updates provider Stripe Connect account information
   - Syncs account status changes

### Environment Variables

Required environment variables for Stripe integration:

```bash
# Client-side (public)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Server-side (private)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PROVIDER_MONTHLY=price_... # Monthly subscription price ID
```

### Setting Up Webhooks

1. **Create Webhook in Stripe Dashboard**
   - Go to Stripe Dashboard > Developers > Webhooks
   - Click "Add endpoint"
   - Enter your webhook URL (ngrok for development, domain for production)
   - Select events: `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`, `account.updated`
   - Copy the signing secret to your environment variables

2. **Test Webhook Locally**
   ```bash
   # Start ngrok
   ngrok http 3000
   
   # Update Stripe webhook URL with ngrok URL
   # Test webhook using Stripe CLI
   stripe trigger checkout.session.completed
   ```

### Security

- All webhook requests are verified using Stripe's signature verification
- Only events with valid signatures are processed
- Webhook handlers are idempotent to handle duplicate events
- All errors are logged with structured information

### Rotating Webhook Secrets

To rotate webhook secrets:

1. Generate new secret in Stripe Dashboard
2. Update `STRIPE_WEBHOOK_SECRET` environment variable
3. Deploy updated configuration
4. Test webhook functionality
5. Remove old webhook endpoint if needed

### Connect Integration

For provider payouts, we use Stripe Connect:

- Providers onboard through Connect Express accounts
- Platform takes configured fee (`PLATFORM_FEE_BPS`)
- Automatic payouts to provider accounts
- Account status updates via `account.updated` webhook

### Testing

Use Stripe CLI to test webhook events:

```bash
# Install Stripe CLI
stripe login

# Forward events to local webhook
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
stripe trigger charge.refunded
```

### Monitoring

- All webhook events are logged with structured data
- Failed webhook processing is logged with error details
- Use Stripe Dashboard to monitor webhook delivery success rates
- Set up alerts for failed webhook deliveries