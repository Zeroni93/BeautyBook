import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { stripe, BILLING_PORTAL_CONFIG_ID } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  console.log('[Billing Portal] Request received')
  
  if (!stripe) {
    console.error('[Billing Portal] Stripe not configured')
    return NextResponse.json(
      { error: 'Payment service not configured' }, 
      { status: 500 }
    )
  }
  
  try {
    const supabase = await createClient()
    
    // Get current user
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[Billing Portal] User authentication failed:', userError)
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }

    console.log('[Billing Portal] User authenticated:', user.id)

    // Get user profile with stripe_customer_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, stripe_customer_id')
      .eq('user_id', user.id)
      .single() as { data: { user_id: string; stripe_customer_id: string | null } | null; error: any }

    if (profileError || !profile) {
      console.error('[Billing Portal] Failed to fetch user profile:', profileError)
      return NextResponse.json({ 
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND'
      }, { status: 404 })
    }

    console.log('[Billing Portal] Profile found:', { 
      profileId: profile.user_id, 
      hasStripeCustomerId: !!profile.stripe_customer_id 
    })

    let customerId = profile.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      console.log('[Billing Portal] Creating new Stripe customer')
      
      try {
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: {
            supabase_user_id: user.id,
            platform: 'beautybook',
            created_via: 'billing_portal'
          }
        })

        customerId = customer.id
        console.log('[Billing Portal] Stripe customer created:', customerId)

        // Save customer ID to profile
        const { error: updateError } = await (supabase as any)
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', user.id)

        if (updateError) {
          console.error('[Billing Portal] Failed to save customer ID:', updateError)
          // Continue anyway - customer exists in Stripe
        } else {
          console.log('[Billing Portal] Customer ID saved to profile')
        }
      } catch (stripeError: any) {
        console.error('[Billing Portal] Stripe customer creation failed:', stripeError)
        return NextResponse.json({ 
          error: 'Failed to create customer account',
          code: 'CUSTOMER_CREATION_FAILED',
          details: stripeError.message
        }, { status: 500 })
      }
    }

    // Create billing portal session
    console.log('[Billing Portal] Creating billing portal session')
    
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        configuration: BILLING_PORTAL_CONFIG_ID,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/provider/dashboard`,
      })

      console.log('[Billing Portal] Portal session created successfully:', session.id)

      return NextResponse.json({ 
        url: session.url,
        success: true
      })
    } catch (stripeError: any) {
      console.error('[Billing Portal] Portal session creation failed:', stripeError)
      return NextResponse.json({ 
        error: 'Failed to create billing portal session',
        code: 'PORTAL_SESSION_FAILED',
        details: stripeError.message
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('[Billing Portal] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    }, { status: 500 })
  }
}