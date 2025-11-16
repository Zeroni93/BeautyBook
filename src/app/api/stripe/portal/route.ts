import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  try {
    // Step 3: Validate required environment variables
    const requiredEnvVars = {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    }

    const missingEnvVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key)

    if (missingEnvVars.length > 0) {
      const errorMsg = `Billing is not configured: ${missingEnvVars[0]} is missing.`
      console.error('[Stripe Portal] Missing environment variables:', missingEnvVars)
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20'
    })

    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[Stripe Portal] Authentication error:', authError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 2: Add logging (dev-only)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Stripe Portal] Request from user:', {
        userId: user.id,
        email: user.email,
      })
    }

    // Step 4: Get user profile and check for existing Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, display_name')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('[Stripe Portal] Profile lookup error:', profileError.message)
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const profileData = profile as any // Type casting to handle missing type definitions
    let stripeCustomerId = profileData?.stripe_customer_id

    if (process.env.NODE_ENV === 'development') {
      console.log('[Stripe Portal] Found stripe_customer_id:', stripeCustomerId || 'None - will create new customer')
    }

    // Step 4: Create Stripe customer if none exists
    if (!stripeCustomerId) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Stripe Portal] Creating new Stripe customer for:', user.email)
        }

        const customer = await stripe.customers.create({
          email: user.email,
          name: profileData?.display_name,
          metadata: {
            supabase_user_id: user.id
          }
        })

        stripeCustomerId = customer.id

        // Persist the customer ID to the profiles table
        const { error: updateError } = await (supabase as any)
          .from('profiles')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('user_id', user.id)

        if (updateError) {
          console.error('[Stripe Portal] Failed to save customer ID:', updateError.message)
          return NextResponse.json({ error: 'Failed to save customer information' }, { status: 500 })
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('[Stripe Portal] Created and saved customer ID:', stripeCustomerId)
        }
      } catch (customerError: any) {
        console.error('[Stripe Portal] Customer creation error:', customerError.message)
        console.error('[Stripe Portal] Customer creation stack:', customerError.stack)
        return NextResponse.json({ error: 'Failed to create billing account' }, { status: 500 })
      }
    }

    // Step 5: Create billing portal session
    // IMPORTANT: Do NOT pass stripeAccount parameter here - billing portal is for platform customers, not Connect accounts
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Stripe Portal] Creating billing portal session for customer:', stripeCustomerId)
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/provider/dashboard`
      })

      if (!session.url) {
        console.error('[Stripe Portal] No session URL returned from Stripe')
        return NextResponse.json({ error: 'Stripe did not return a portal URL.' }, { status: 500 })
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[Stripe Portal] Successfully created session URL')
      }

      return NextResponse.json({ url: session.url })
    } catch (portalError: any) {
      console.error('[Stripe Portal] Portal session creation error:', portalError.message)
      console.error('[Stripe Portal] Portal session stack:', portalError.stack)
      return NextResponse.json({ 
        error: `Failed to create billing portal: ${portalError.message}` 
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('[Stripe Portal] Unexpected error:', error.message)
    console.error('[Stripe Portal] Unexpected error stack:', error.stack)
    return NextResponse.json({ 
      error: 'An unexpected error occurred while opening the billing portal' 
    }, { status: 500 })
  }
}