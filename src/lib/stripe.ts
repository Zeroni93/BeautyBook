import Stripe from 'stripe'

// Validate required environment variables but allow graceful degradation in development
const requiredEnvVars = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_ID_STARTER: process.env.STRIPE_PRICE_ID_STARTER,
  STRIPE_PRICE_ID_PRO: process.env.STRIPE_PRICE_ID_PRO,
  STRIPE_PRICE_ID_ELITE: process.env.STRIPE_PRICE_ID_ELITE,
  STRIPE_BILLING_PORTAL_CONFIGURATION_ID: process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
} as const

// Check for missing environment variables but only throw in production
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key, _]) => key)

if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
  throw new Error(
    `Missing required Stripe environment variables: ${missingVars.join(', ')}. ` +
    'Ensure all live Stripe keys are properly configured.'
  )
}

// Initialize Stripe only if secret key is available
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    })
  : null

// Export price IDs for easy access with fallbacks
export const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_ID_STARTER || 'price_starter_fallback',
  pro: process.env.STRIPE_PRICE_ID_PRO || 'price_pro_fallback',
  elite: process.env.STRIPE_PRICE_ID_ELITE || 'price_elite_fallback',
} as const

export const BILLING_PORTAL_CONFIG_ID = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID || ''

// Type for subscription tiers
export type SubscriptionTier = 'starter' | 'pro' | 'elite'

// Helper to map price ID to tier
export function getTierFromPriceId(priceId: string): SubscriptionTier | null {
  switch (priceId) {
    case PRICE_IDS.starter:
      return 'starter'
    case PRICE_IDS.pro:
      return 'pro'
    case PRICE_IDS.elite:
      return 'elite'
    default:
      return null
  }
}

// Client-side publishable key validation with fallback
export function getStripePublishableKey() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required in production')
  }
  return key || ''
}

// Webhook secret validation with fallback
export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('STRIPE_WEBHOOK_SECRET is required in production')
  }
  return secret || ''
}