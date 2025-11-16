import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const state = searchParams.get('state')
  const code = searchParams.get('code')
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {
          // Not needed for read-only operations
        },
        remove() {
          // Not needed for read-only operations
        },
      },
    }
  )

  try {
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error in Stripe return:', authError)
      return NextResponse.redirect(new URL('/auth/sign-in?error=auth-required', request.url))
    }

    if (!code) {
      console.error('No Stripe Connect code provided')
      return NextResponse.redirect(new URL('/provider/onboarding?error=stripe-error', request.url))
    }

    // TODO: In a real implementation, you would:
    // 1. Exchange the code for access token with Stripe
    // 2. Verify the account has charges_enabled or appropriate test mode status
    // 3. Store the account ID in provider_profiles.stripe_connect_id
    
    // For now, simulate a successful Stripe Connect setup
    const simulatedStripeAccountId = `acct_${Date.now()}`
    
    // Update provider profile with Stripe Connect ID
    const { error: updateError } = await supabase
      .from('provider_profiles')
      .update({ stripe_connect_id: simulatedStripeAccountId } as any)
      .eq('provider_id', user.id)

    if (updateError) {
      console.error('Error updating Stripe Connect ID:', updateError)
      return NextResponse.redirect(new URL('/provider/onboarding?error=db-error', request.url))
    }

    // Check if provider has completed all onboarding requirements
    const { data: providerProfile } = await supabase
      .from('provider_profiles')
      .select('subscription_status')
      .eq('provider_id', user.id)
      .single()

    // Check if provider has services and availability
    const { count: serviceCount } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', user.id)
      .eq('is_active', true)

    const { count: availabilityCount } = await supabase
      .from('availability_rules')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', user.id)
      .eq('is_active', true)

    const hasActiveSub = (providerProfile as any)?.subscription_status === 'active'
    const hasService = (serviceCount || 0) > 0
    const hasAvailability = (availabilityCount || 0) > 0
    const onboardingComplete = hasActiveSub && hasService && hasAvailability

    if (onboardingComplete) {
      // All requirements met, mark as completed and redirect to dashboard
      
      // TODO: Uncomment when migration is applied
      /*
      const { error: statusError } = await supabase
        .from('provider_profiles')
        .update({ onboarding_status: 'completed' })
        .eq('provider_id', user.id)

      if (statusError) {
        console.warn('Error updating onboarding status:', statusError)
        // Don't fail the entire flow for this
      }
      */

      return NextResponse.redirect(new URL('/provider/dashboard?stripe=connected', request.url))
    } else {
      // Still missing requirements, go back to onboarding
      
      // TODO: Uncomment when migration is applied
      /*
      const { error: statusError } = await supabase
        .from('provider_profiles')
        .update({ onboarding_status: 'in_progress' })
        .eq('provider_id', user.id)

      if (statusError) {
        console.warn('Error updating onboarding status:', statusError)
      }
      */

      return NextResponse.redirect(new URL('/provider/onboarding?stripe=connected', request.url))
    }
  } catch (error) {
    console.error('Error in Stripe Connect return handler:', error)
    return NextResponse.redirect(new URL('/provider/onboarding?error=unexpected', request.url))
  }
}