-- Add onboarding status enum and column to provider_profiles
-- Created: November 9, 2025
-- Purpose: Track provider onboarding completion status for proper redirects

-- Create enum for onboarding status
CREATE TYPE onboarding_status AS ENUM ('not_started', 'in_progress', 'completed');

-- Add onboarding_status column to provider_profiles
ALTER TABLE provider_profiles 
ADD COLUMN onboarding_status onboarding_status NOT NULL DEFAULT 'not_started';

-- Add index for performance on onboarding status lookups
CREATE INDEX idx_provider_profiles_onboarding_status ON provider_profiles(onboarding_status);

-- Update existing provider profiles to have proper onboarding status based on their data
UPDATE provider_profiles 
SET onboarding_status = CASE 
  WHEN stripe_connect_id IS NOT NULL 
    AND subscription_status = 'active' 
    AND EXISTS (SELECT 1 FROM services WHERE provider_id = provider_profiles.provider_id AND is_active = true)
    AND EXISTS (SELECT 1 FROM availability_rules WHERE provider_id = provider_profiles.provider_id AND is_active = true)
  THEN 'completed'::onboarding_status
  WHEN stripe_connect_id IS NOT NULL OR subscription_status = 'active' OR 
       EXISTS (SELECT 1 FROM services WHERE provider_id = provider_profiles.provider_id) OR
       EXISTS (SELECT 1 FROM availability_rules WHERE provider_id = provider_profiles.provider_id)
  THEN 'in_progress'::onboarding_status
  ELSE 'not_started'::onboarding_status
END;

-- Add comment for documentation
COMMENT ON COLUMN provider_profiles.onboarding_status IS 'Tracks provider onboarding completion: not_started (new), in_progress (partial), completed (all requirements met)';