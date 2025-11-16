# Setup Guide

This guide will help you set up the Beauty Book application from scratch.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** or **yarn** package manager
- **Git** for version control
- A **Supabase** account
- A **Stripe** account (test mode for development)

## Step-by-Step Setup

### 1. Environment Setup

1. **Clone the repository**
   ```bash
   git clone [your-repo-url]
   cd beautybook
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Copy environment file**
   ```bash
   cp .env.example .env.local
   ```

### 2. Supabase Configuration

1. **Create a new Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the project to be fully provisioned

2. **Get your Supabase credentials**
   - Project URL: Found in Settings > API
   - Anon Key: Found in Settings > API
   - Service Role Key: Found in Settings > API (keep this secret!)

3. **Update your .env.local file**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### 3. Database Setup

1. **Run the initial schema migration**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor
   - Copy and paste the content from `supabase/migrations/20241109000001_initial_schema.sql`
   - Execute the SQL

2. **Set up Row Level Security policies**
   - In the same SQL Editor
   - Copy and paste the content from `supabase/migrations/20241109000002_rls_policies.sql`
   - Execute the SQL

3. **Add onboarding status tracking**
   - In the same SQL Editor
   - Copy and paste the content from `supabase/migrations/20241109000003_add_onboarding_status.sql`
   - Execute the SQL

4. **Set up onboarding RLS policies**
   - In the same SQL Editor
   - Copy and paste the content from `supabase/migrations/20241109000004_onboarding_rls.sql`
   - Execute the SQL

5. **Verify the setup**
   - Check the Tables view to ensure all tables were created
   - Verify that RLS is enabled on all tables
   - Confirm that provider_profiles table has onboarding_status column

### 4. Stripe Configuration

1. **Get your Stripe keys**
   - Go to [stripe.com](https://stripe.com)
   - Navigate to Developers > API keys
   - Copy your Publishable key and Secret key (test mode)

2. **Create a subscription product**
   - Go to Products in your Stripe dashboard
   - Create a new product for "Provider Subscription"
   - Set the price to $5.00 USD monthly
   - Copy the Price ID

3. **Set up webhooks**
   - Go to Developers > Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select events: `payment_intent.succeeded`, `customer.subscription.updated`, etc.
   - Copy the webhook secret

4. **Update your .env.local file**
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_PROVIDER_MONTHLY=price_...
   ```

### 5. Additional Configuration

1. **Site URL**
   ```env
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

2. **Platform settings**
   ```env
   PLATFORM_FEE_BPS=1000  # 10%
   MAX_IMAGE_MB=10
   MAX_VIDEO_MB=200
   ```

3. **Feature flags**
   ```env
   ALLOW_DOUBLE_BOOKING=false
   FEATURE_SEO_PUBLIC=false
   FEATURE_CRON_JOBS=false
   ```

### 6. Start the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### 7. Verify Setup

1. **Test user registration**
   - Go to `/signup`
   - Create a client account
   - Create a provider account

2. **Test provider onboarding**
   - Create a provider account
   - Verify onboarding flow redirects work
   - Complete the onboarding process
   - Confirm dashboard access after completion

3. **Test authentication**
   - Log in with both accounts
   - Verify role-based redirects work

4. **Check provider onboarding**
   - Verify provider profiles have onboarding_status field
   - Test that incomplete providers are redirected to onboarding
   - Confirm completed providers can access dashboard

## Common Issues

### Database Connection Issues
- Verify your Supabase URL and keys are correct
- Ensure your project is fully provisioned
- Check that RLS policies are properly applied

### Authentication Issues
- Clear browser localStorage/cookies
- Verify Supabase Auth is properly configured
- Check middleware configuration

### Stripe Issues
- Ensure you're using test mode keys
- Verify webhook endpoints are correctly configured
- Check that webhook secrets match

## Next Steps

Once setup is complete:
1. Read the [Database Schema](./db.md) documentation
2. Review the [Provider Onboarding](./onboarding.md) system
3. Check out the [Payments](./payments.md) integration
4. Review the [Environment Setup](./env-setup.md) guide

## Getting Help

If you encounter issues during setup:
1. Check the console for error messages
2. Review the Supabase and Stripe dashboard logs
3. Open an issue on GitHub with detailed error information