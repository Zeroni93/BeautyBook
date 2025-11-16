'use server'

import { createServerSupabase } from '@/lib/supabase'

export type OnboardingStep = 'profile' | 'payments' | 'service' | 'availability'

export type OnboardingStepResult = {
  success: boolean
  nextStep?: OnboardingStep
  isComplete?: boolean
  error?: string
}

/**
 * Update onboarding step completion status
 * This is a simplified version that works with existing schema
 */
export async function updateOnboardingStep(
  providerId: string,
  step: OnboardingStep
): Promise<OnboardingStepResult> {
  const supabase = createServerSupabase()
  
  try {
    // For now, use a simplified approach with existing columns
    // This will be enhanced after the migration is applied
    
    // Check current provider state
    const { data: provider, error: fetchError } = await supabase
      .from('provider_profiles')
      .select(`
        subscription_status,
        updated_at
      `)
      .eq('provider_id', providerId)
      .single()
    
    if (fetchError) {
      console.error('Failed to fetch provider for onboarding update:', fetchError)
      return { success: false, error: fetchError.message }
    }
    
    if (!provider) {
      return { success: false, error: 'Provider not found' }
    }
    
    // Check if provider has services and availability
    const { data: services } = await supabase
      .from('services')
      .select('id')
      .eq('provider_id', providerId)
      .eq('is_active', true)
      .limit(1)
    
    const { data: availability } = await supabase
      .from('availability_rules')
      .select('id')
      .eq('provider_id', providerId)
      .eq('is_active', true)
      .limit(1)
    
    const hasService = !!(services && services.length > 0)
    const hasAvailability = !!(availability && availability.length > 0)
    const hasActiveSubscription = provider.subscription_status === 'active'
    
    // Determine completion status
    const isComplete = hasService && hasAvailability && hasActiveSubscription
    
    // Determine next step
    let nextStep: OnboardingStep | undefined
    if (!hasActiveSubscription) {
      nextStep = 'payments'
    } else if (!hasService) {
      nextStep = 'service'
    } else if (!hasAvailability) {
      nextStep = 'availability'
    }
    
    // Update timestamp to track activity
    await supabase
      .from('provider_profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('provider_id', providerId)
    
    return { 
      success: true, 
      nextStep,
      isComplete
    }
    
  } catch (error) {
    console.error('Error in updateOnboardingStep:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Check current onboarding status and return next step
 */
export async function getOnboardingStatus(providerId: string): Promise<{
  isComplete: boolean
  nextStep?: OnboardingStep
  currentSteps: Record<OnboardingStep, boolean>
  missingRequirements: string[]
}> {
  const supabase = createServerSupabase()
  
  try {
    // Get provider data
    const { data: provider, error } = await supabase
      .from('provider_profiles')
      .select('*')
      .eq('provider_id', providerId)
      .single()
    
    if (error || !provider) {
      throw new Error('Failed to fetch provider data')
    }
    
    // Check if provider has services and availability
    const { data: services } = await supabase
      .from('services')
      .select('id')
      .eq('provider_id', providerId)
      .eq('is_active', true)
      .limit(1)
    
    const { data: availability } = await supabase
      .from('availability_rules')
      .select('id')
      .eq('provider_id', providerId)
      .eq('is_active', true)
      .limit(1)
    
    const hasService = !!(services && services.length > 0)
    const hasAvailability = !!(availability && availability.length > 0)
    const hasActiveSubscription = provider.subscription_status === 'active'
    const hasProfile = !!(provider.business_name && provider.address_line1 && provider.city)
    
    const currentSteps: Record<OnboardingStep, boolean> = {
      profile: hasProfile,
      payments: hasActiveSubscription,
      service: hasService,
      availability: hasAvailability
    }
    
    const missingRequirements: string[] = []
    let nextStep: OnboardingStep | undefined
    
    if (!hasProfile) {
      nextStep = 'profile'
      missingRequirements.push('Complete business profile')
    } else if (!hasActiveSubscription) {
      nextStep = 'payments'
      missingRequirements.push('Set up subscription and payments')
    } else if (!hasService) {
      nextStep = 'service'
      missingRequirements.push('Create at least one service')
    } else if (!hasAvailability) {
      nextStep = 'availability'
      missingRequirements.push('Set up availability schedule')
    }
    
    const isComplete = hasProfile && hasActiveSubscription && hasService && hasAvailability
    
    return {
      isComplete,
      nextStep,
      currentSteps,
      missingRequirements
    }
    
  } catch (error) {
    console.error('Error getting onboarding status:', error)
    return {
      isComplete: false,
      nextStep: 'profile',
      currentSteps: {
        profile: false,
        payments: false,
        service: false,
        availability: false
      },
      missingRequirements: ['Complete setup to get started']
    }
  }
}

/**
 * Mark a service step as complete when a service is created
 */
export async function completeServiceStep(providerId: string): Promise<OnboardingStepResult> {
  return updateOnboardingStep(providerId, 'service')
}

/**
 * Mark availability step as complete when availability is set
 */
export async function completeAvailabilityStep(providerId: string): Promise<OnboardingStepResult> {
  return updateOnboardingStep(providerId, 'availability')
}

/**
 * Mark profile step as complete when profile is saved
 */
export async function completeProfileStep(providerId: string): Promise<OnboardingStepResult> {
  return updateOnboardingStep(providerId, 'profile')
}

/**
 * Get provider readiness for dashboard
 */
export async function getProviderReadiness(providerId: string): Promise<{
  isReady: boolean
  missingSubscription: boolean
  missingService: boolean
  missingAvailability: boolean
  missingProfile: boolean
}> {
  const status = await getOnboardingStatus(providerId)
  
  return {
    isReady: status.isComplete,
    missingSubscription: !status.currentSteps.payments,
    missingService: !status.currentSteps.service,
    missingAvailability: !status.currentSteps.availability,
    missingProfile: !status.currentSteps.profile
  }
}