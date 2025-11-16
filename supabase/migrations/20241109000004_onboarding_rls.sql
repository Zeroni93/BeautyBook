-- Add RLS policies for onboarding_status in provider_profiles
-- Created: November 9, 2025
-- Purpose: Allow providers to update their own onboarding status

-- Update the existing provider_profiles RLS policy to include onboarding_status
-- First, let's drop the existing policy and recreate it with the new column

-- Allow providers to update their own onboarding_status
DROP POLICY IF EXISTS "Providers can update their own profile" ON provider_profiles;

CREATE POLICY "Providers can update their own profile" ON provider_profiles
FOR UPDATE 
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Add specific policy for onboarding_status updates
CREATE POLICY "Providers can update their onboarding status" ON provider_profiles
FOR UPDATE (onboarding_status)
USING (auth.uid() = provider_id);

-- Allow reading onboarding_status in provider profile queries
-- This should already be covered by existing SELECT policies, but let's be explicit
CREATE POLICY "Providers can read their onboarding status" ON provider_profiles
FOR SELECT 
USING (auth.uid() = provider_id OR is_verified = true);

-- Add audit log entry function for onboarding completion
CREATE OR REPLACE FUNCTION log_onboarding_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when onboarding_status changes to 'completed'
  IF NEW.onboarding_status = 'completed' AND OLD.onboarding_status != 'completed' THEN
    INSERT INTO audit_logs (actor_id, action, target_table, target_id, diff)
    VALUES (
      NEW.provider_id,
      'onboarding_completed',
      'provider_profiles',
      NEW.provider_id,
      jsonb_build_object(
        'old_status', OLD.onboarding_status,
        'new_status', NEW.onboarding_status,
        'completed_at', NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic audit logging
DROP TRIGGER IF EXISTS trigger_log_onboarding_completion ON provider_profiles;
CREATE TRIGGER trigger_log_onboarding_completion
  AFTER UPDATE OF onboarding_status ON provider_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_onboarding_completion();