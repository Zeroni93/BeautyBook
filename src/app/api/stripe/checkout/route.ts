import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { stripe, PRICE_IDS, type SubscriptionTier } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  console.log('[Checkout] Request received')
  
  if (!stripe) {
    console.error('[Checkout] Stripe not configured')
    return NextResponse.json(
      { error: 'Payment service not configured' }, 
      { status: 500 }
    )
  }
  
  try {
    const supabase = await createClient()
    
    // Get request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      console.error('[Checkout] Invalid JSON body:', error)
      return NextResponse.json({ 
        error: 'Invalid request body',
        code: 'INVALID_JSON'
      }, { status: 400 })
    }

    const { tier } = body

    // Validate tier
    if (!tier || !PRICE_IDS[tier as SubscriptionTier]) {
      console.error('[Checkout] Invalid tier:', tier)
      return NextResponse.json({ 
        error: 'Invalid subscription tier',
        code: 'INVALID_TIER',
        validTiers: Object.keys(PRICE_IDS)
      }, { status: 400 })
    }

    // Get current user
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[Checkout] User authentication failed:', userError)
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 })
    }

    console.log('[Checkout] User authenticated:', user.id)

    // Get user profile with stripe_customer_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, stripe_customer_id, display_name')
      .eq('user_id', user.id)
      .single() as { data: { user_id: string; stripe_customer_id: string | null; display_name: string } | null; error: any }

    if (profileError || !profile) {
      console.error('[Checkout] Failed to fetch user profile:', profileError)
      return NextResponse.json({ 
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND'
      }, { status: 404 })
    }

    console.log('[Checkout] Profile found:', { 
      profileId: profile.user_id, 
      hasStripeCustomerId: !!profile.stripe_customer_id 
    })

    let customerId = profile.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      console.log('[Checkout] Creating new Stripe customer for checkout')
      
      try {
        const customer = await stripe.customers.create({
          email: user.email!,
          name: profile.display_name,
          metadata: {
            supabase_user_id: user.id,
            platform: 'beautybook',
            created_via: 'checkout'
          }
        })

        customerId = customer.id
        console.log('[Checkout] Stripe customer created:', customerId)

        // Save customer ID to profile
        const { error: updateError } = await (supabase as any)
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', user.id)

        if (updateError) {
          console.error('[Checkout] Failed to save customer ID:', updateError)
          // Continue anyway - customer exists in Stripe
        } else {
          console.log('[Checkout] Customer ID saved to profile')
        }
      } catch (stripeError: any) {
        console.error('[Checkout] Stripe customer creation failed:', stripeError)
        return NextResponse.json({ 
          error: 'Failed to create customer account',
          code: 'CUSTOMER_CREATION_FAILED',
          details: stripeError.message
        }, { status: 500 })
      }
    }

    // Create Stripe Checkout session
    console.log('[Checkout] Creating checkout session for tier:', tier)
    
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: PRICE_IDS[tier as SubscriptionTier],
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/provider/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/provider/onboarding?step=payments&cancelled=true`,
        metadata: {
          supabase_user_id: user.id,
          subscription_tier: tier,
        },
        subscription_data: {
          metadata: {
            supabase_user_id: user.id,
            subscription_tier: tier,
          },
        },
      })

      console.log('[Checkout] Checkout session created successfully:', session.id)

      return NextResponse.json({ 
        url: session.url,
        sessionId: session.id,
        success: true
      })
    } catch (stripeError: any) {
      console.error('[Checkout] Checkout session creation failed:', stripeError)
      return NextResponse.json({ 
        error: 'Failed to create checkout session',
        code: 'CHECKOUT_SESSION_FAILED',
        details: stripeError.message
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('[Checkout] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    }, { status: 500 })
  }
}