# Environment Setup Guide

## Environment Variables

This application requires several environment variables to function properly. All variables should be defined in `.env.local` for local development.

### Supabase Configuration

**NEXT_PUBLIC_SUPABASE_URL**
- **Usage**: Client and server-side Supabase API calls
- **Format**: `https://your-project.supabase.co`
- **Location**: Used in `src/lib/auth/client.ts` and `src/lib/auth/server.ts`
- **Rotation**: Update in Supabase dashboard, then update environment variable

**NEXT_PUBLIC_SUPABASE_ANON_KEY**
- **Usage**: Client-side authentication and public API access
- **Format**: JWT token string
- **Location**: Used in Supabase client configurations
- **Rotation**: Regenerate in Supabase dashboard > Settings > API

**SUPABASE_SERVICE_ROLE_KEY** ⚠️
- **Usage**: Server-side admin operations ONLY (webhooks, background jobs)
- **Format**: JWT token string
- **Security**: NEVER expose in client code - server-only environments
- **Required by**: Stripe webhooks (`/api/webhooks/stripe`), admin operations
- **Location**: Supabase Dashboard > Settings > API > Project API Keys > service_role
- **Rotation**: Regenerate in Supabase dashboard > Settings > API
- **Note**: Optional for user-facing operations (uses anon key + RLS instead)

### Stripe Configuration

**NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**
- **Usage**: Client-side payment forms and Stripe Elements
- **Format**: `pk_test_...` or `pk_live_...`
- **Location**: Used in payment components and checkout flows
- **Rotation**: Generate new key in Stripe Dashboard > API keys

**STRIPE_SECRET_KEY**
- **Usage**: Server-side Stripe API operations
- **Format**: `sk_test_...` or `sk_live_...`
- **Location**: Used in `src/lib/stripe.ts` for server operations
- **Rotation**: Generate new key in Stripe Dashboard > API keys

**STRIPE_WEBHOOK_SECRET**
- **Usage**: Webhook signature verification
- **Format**: `whsec_...`
- **Location**: Used in `src/app/api/webhooks/stripe/route.ts`
- **Rotation**: Generate new secret when creating webhook endpoint

**STRIPE_PRICE_ID_PROVIDER_MONTHLY**
- **Usage**: Provider subscription billing
- **Format**: `price_...`
- **Location**: Used in subscription flows and billing
- **Rotation**: Create new price in Stripe Dashboard > Products

### Application Configuration

**NEXT_PUBLIC_SITE_URL**
- **Usage**: Base URL for redirects, emails, and absolute URLs
- **Format**: `http://localhost:3000` (dev) or `https://yourdomain.com` (prod)
- **Location**: Used throughout the application for URL generation
- **Rotation**: Update when changing domains

**PLATFORM_FEE_BPS**
- **Usage**: Platform fee calculation (basis points)
- **Format**: Integer (e.g., 1000 = 10%)
- **Location**: Used in booking and payment calculations
- **Rotation**: Update as needed for business requirements

## Files Requiring Service Role Key

The following files require `SUPABASE_SERVICE_ROLE_KEY` and will fail if it's missing:

### ⚠️ Critical (Admin Operations)
- `src/app/api/webhooks/stripe/route.ts` - Stripe webhooks for subscription management
  - **Why**: Bypasses RLS to update subscription status across user boundaries
  - **Impact**: Payment processing will fail without this key

### ✅ Development Only
- `src/app/api/health/env/route.ts` - Environment status checking
  - **Why**: Reports environment configuration status
  - **Impact**: Development debugging only, not required for core functionality

### ✅ User Operations (No Service Key Required)
- `src/app/provider/onboarding/actions.ts` - Uses `createServerSupabase()` with RLS
- All client components - Use `createBrowserSupabase()` with anon key
- Authentication flows - Use anon key with RLS policies
- User dashboard operations - Use anon key with RLS policies

### Feature Flags

**FEATURE_SEO_PUBLIC**
- **Usage**: Enable/disable public SEO optimization
- **Format**: `true` or `false`
- **Location**: Used in layout and page components
- **Rotation**: Toggle as needed

**FEATURE_CRON_JOBS**
- **Usage**: Enable/disable scheduled background jobs
- **Format**: `true` or `false`
- **Location**: Used in background job configurations
- **Rotation**: Toggle based on deployment environment

**ALLOW_DOUBLE_BOOKING**
- **Usage**: Allow providers to accept overlapping bookings
- **Format**: `true` or `false`
- **Location**: Used in booking validation logic
- **Rotation**: Update based on business rules

### External Services

**RESEND_API_KEY**
- **Usage**: Email notifications and transactional emails
- **Format**: API key string
- **Location**: Used in email service configurations
- **Rotation**: Generate new key in Resend dashboard

**ANALYTICS_PROVIDER**
- **Usage**: Specify analytics service
- **Format**: `ga4`, `mixpanel`, etc.
- **Location**: Used in analytics service initialization
- **Rotation**: Update when changing analytics providers

**NOTIFICATIONS_PROVIDER**
- **Usage**: Specify email service provider
- **Format**: `resend`, `sendgrid`, etc.
- **Location**: Used in notification service configuration
- **Rotation**: Update when changing email providers

### Internationalization

**DEFAULT_LOCALE**
- **Usage**: Default language for the application
- **Format**: Language code (e.g., `en`, `es`, `fr`)
- **Location**: Used in i18n configuration
- **Rotation**: Update when changing default language

**SUPPORTED_LOCALES**
- **Usage**: Comma-separated list of supported languages
- **Format**: `en,es,fr,de,zh,ja,pt`
- **Location**: Used in i18n routing and locale detection
- **Rotation**: Update when adding/removing language support

### Media Configuration

**MAX_IMAGE_MB**
- **Usage**: Maximum image file size for uploads
- **Format**: Integer (megabytes)
- **Location**: Used in file upload validation
- **Rotation**: Update based on storage and performance requirements

**MAX_VIDEO_MB**
- **Usage**: Maximum video file size for uploads
- **Format**: Integer (megabytes)
- **Location**: Used in file upload validation
- **Rotation**: Update based on storage and performance requirements

## Setup Instructions

### Local Development

1. **Copy environment template**:
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in required values**:
   - Get Supabase credentials from your project dashboard
   - Get Stripe keys from your Stripe dashboard
   - Set local development URL

3. **Restart development server**:
   ```bash
   npm run dev
   ```

### Production Deployment

1. **Vercel**:
   - Add environment variables in Vercel dashboard
   - Use production Stripe keys
   - Set production site URL

2. **Other Platforms**:
   - Configure environment variables in deployment platform
   - Ensure all required variables are set
   - Use production service keys

## Security Best Practices

1. **Never commit secrets**:
   - Use `.env.local` for local development
   - Use secure environment variable storage in production
   - Rotate keys regularly

2. **Principle of least privilege**:
   - Use anon keys for client-side operations
   - Use service role keys only for admin operations
   - Limit webhook endpoint access

3. **Monitoring**:
   - Monitor for unauthorized API usage
   - Set up alerts for failed authentication
   - Log security-related events

## Troubleshooting

### Common Issues

1. **"SUPABASE_SERVICE_ROLE_KEY environment variable is required" error**:
   - This error occurs when webhooks or admin operations run without the service key
   - ✅ For development: Service key is only required for webhook testing
   - ✅ For production: Service key is required for Stripe webhooks
   - Check `/api/health/env` endpoint to verify environment status

2. **Supabase connection fails**:
   - Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
   - Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is valid
   - Restart development server after changes

3. **Stripe payments fail**:
   - Verify `STRIPE_SECRET_KEY` is correct for environment
   - Check `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` matches
   - Ensure webhook secret is current

4. **Environment variables not loading**:
   - Check file is named `.env.local` (not `.env.local.txt`)
   - Restart development server
   - Verify variables are in correct format (no quotes)