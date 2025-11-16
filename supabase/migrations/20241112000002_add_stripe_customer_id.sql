-- Add stripe_customer_id to profiles table for billing portal
-- This is separate from stripe_connect_id which is for Connect accounts

-- Add stripe_customer_id column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Add comment for clarity
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for billing portal (not Connect account)';