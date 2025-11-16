-- Comprehensive Provider Onboarding State Migration
-- Created: November 9, 2025
-- Purpose: Replace enum-based onboarding_status with detailed boolean flags for granular control

-- First, add the new columns to provider_profiles
ALTER TABLE provider_profiles 
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_steps JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS has_service BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS has_availability BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS last_onboarding_at TIMESTAMPTZ;

-- Note: subscription_status already exists from initial schema

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_provider_profiles_onboarding_complete ON provider_profiles(onboarding_complete);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_has_service ON provider_profiles(has_service);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_has_availability ON provider_profiles(has_availability);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_subscription_status ON provider_profiles(subscription_status);

-- Migrate existing data from onboarding_status enum to new boolean flags
UPDATE provider_profiles SET
  onboarding_complete = CASE 
    WHEN onboarding_status = 'completed' THEN true 
    ELSE false 
  END,
  onboarding_steps = CASE 
    WHEN onboarding_status = 'completed' THEN '{"profile": true, "payments": true, "service": true, "availability": true}'::jsonb
    WHEN onboarding_status = 'in_progress' THEN '{"profile": true}'::jsonb
    ELSE '{}'::jsonb
  END,
  has_service = EXISTS (SELECT 1 FROM services WHERE provider_id = provider_profiles.provider_id AND is_active = true),
  has_availability = EXISTS (SELECT 1 FROM availability_rules WHERE provider_id = provider_profiles.provider_id AND is_active = true),
  last_onboarding_at = CASE 
    WHEN onboarding_status = 'completed' THEN updated_at 
    ELSE NULL 
  END;

-- Update onboarding_steps based on actual data
UPDATE provider_profiles SET
  onboarding_steps = onboarding_steps || 
    CASE WHEN stripe_connect_id IS NOT NULL THEN '{"payments": true}'::jsonb ELSE '{}'::jsonb END ||
    CASE WHEN has_service THEN '{"service": true}'::jsonb ELSE '{}'::jsonb END ||
    CASE WHEN has_availability THEN '{"availability": true}'::jsonb ELSE '{}'::jsonb END;

-- Create the provider_readiness view
CREATE OR REPLACE VIEW provider_readiness AS
SELECT 
  pp.provider_id,
  -- Main readiness calculation
  (pp.onboarding_complete = true 
   AND pp.has_service = true 
   AND pp.has_availability = true 
   AND pp.subscription_status = 'active') as is_ready,
  
  -- Individual requirement flags for dashboard banners
  pp.onboarding_complete,
  pp.has_service,
  pp.has_availability,
  (pp.subscription_status = 'active') as has_active_subscription,
  
  -- Missing requirement booleans
  NOT pp.onboarding_complete as missing_onboarding,
  NOT pp.has_service as missing_service,
  NOT pp.has_availability as missing_availability,
  (pp.subscription_status != 'active') as missing_subscription,
  
  -- Step completion details
  pp.onboarding_steps,
  (pp.onboarding_steps->>'profile')::boolean as profile_complete,
  (pp.onboarding_steps->>'payments')::boolean as payments_complete,
  (pp.onboarding_steps->>'service')::boolean as service_complete,
  (pp.onboarding_steps->>'availability')::boolean as availability_complete,
  
  -- Metadata
  pp.subscription_status,
  pp.last_onboarding_at,
  pp.created_at,
  pp.updated_at
FROM provider_profiles pp;

-- Grant access to the view
GRANT SELECT ON provider_readiness TO authenticated;

-- Add RLS policy for the view
CREATE POLICY "Providers can read their own readiness status"
ON provider_readiness FOR SELECT
TO authenticated
USING (auth.uid() = provider_id);

-- Add comments for documentation
COMMENT ON TABLE provider_profiles IS 'Extended with comprehensive onboarding state tracking';
COMMENT ON COLUMN provider_profiles.onboarding_complete IS 'True when all onboarding steps and requirements are complete';
COMMENT ON COLUMN provider_profiles.onboarding_steps IS 'JSON object tracking completion of individual steps: profile, payments, service, availability';
COMMENT ON COLUMN provider_profiles.has_service IS 'True when provider has at least one active service';
COMMENT ON COLUMN provider_profiles.has_availability IS 'True when provider has availability rules configured';
COMMENT ON COLUMN provider_profiles.last_onboarding_at IS 'Timestamp when onboarding was completed';

COMMENT ON VIEW provider_readiness IS 'Comprehensive view of provider onboarding and readiness status with missing requirement flags';

-- Create function to automatically update has_service flag when services change
CREATE OR REPLACE FUNCTION update_provider_has_service()
RETURNS TRIGGER AS $$
BEGIN
  -- Update has_service flag based on active services
  UPDATE provider_profiles 
  SET has_service = EXISTS (
    SELECT 1 FROM services 
    WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id) 
    AND is_active = true
  ),
  updated_at = NOW()
  WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to automatically update has_availability flag when availability changes
CREATE OR REPLACE FUNCTION update_provider_has_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Update has_availability flag based on active availability rules
  UPDATE provider_profiles 
  SET has_availability = EXISTS (
    SELECT 1 FROM availability_rules 
    WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id) 
    AND is_active = true
  ),
  updated_at = NOW()
  WHERE provider_id = COALESCE(NEW.provider_id, OLD.provider_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically maintain has_service and has_availability flags
DROP TRIGGER IF EXISTS trigger_update_provider_has_service ON services;
CREATE TRIGGER trigger_update_provider_has_service
  AFTER INSERT OR UPDATE OR DELETE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_has_service();

DROP TRIGGER IF EXISTS trigger_update_provider_has_availability ON availability_rules;
CREATE TRIGGER trigger_update_provider_has_availability
  AFTER INSERT OR UPDATE OR DELETE ON availability_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_has_availability();

-- Create function to check and complete onboarding when all requirements are met
CREATE OR REPLACE FUNCTION check_and_complete_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if onboarding should be completed
  IF NEW.onboarding_complete = false AND
     (NEW.onboarding_steps->>'profile')::boolean = true AND
     (NEW.onboarding_steps->>'payments')::boolean = true AND
     (NEW.onboarding_steps->>'service')::boolean = true AND
     (NEW.onboarding_steps->>'availability')::boolean = true AND
     NEW.subscription_status = 'active' AND
     NEW.has_service = true AND
     NEW.has_availability = true THEN
    
    NEW.onboarding_complete = true;
    NEW.last_onboarding_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-complete onboarding
DROP TRIGGER IF EXISTS trigger_check_onboarding_completion ON provider_profiles;
CREATE TRIGGER trigger_check_onboarding_completion
  BEFORE UPDATE ON provider_profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_and_complete_onboarding();

-- Remove the old onboarding_status column and enum (optional - can be kept for backward compatibility)
-- ALTER TABLE provider_profiles DROP COLUMN IF EXISTS onboarding_status;
-- DROP TYPE IF EXISTS onboarding_status;

-- For now, keep the enum for backward compatibility but add a computed column for migration
ALTER TABLE provider_profiles 
ADD COLUMN IF NOT EXISTS computed_onboarding_status onboarding_status 
GENERATED ALWAYS AS (
  CASE 
    WHEN onboarding_complete = true THEN 'completed'::onboarding_status
    WHEN onboarding_steps != '{}'::jsonb THEN 'in_progress'::onboarding_status
    ELSE 'not_started'::onboarding_status
  END
) STORED;

CREATE INDEX IF NOT EXISTS idx_provider_profiles_computed_onboarding_status ON provider_profiles(computed_onboarding_status);