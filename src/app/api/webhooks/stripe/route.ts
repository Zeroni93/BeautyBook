import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe, getStripeWebhookSecret, getTierFromPriceId } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/types'

// Create admin Supabase client for webhook operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  console.log('[Stripe Webhook] Request received')
  
  if (!stripe) {
    console.error('[Stripe Webhook] Stripe not configured')
    return NextResponse.json(
      { error: 'Payment service not configured' }, 
      { status: 500 }
    )
  }
  
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    console.error('[Stripe Webhook] Missing signature')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookSecret()
    )
  } catch (error: any) {
    console.error('[Stripe Webhook] Invalid signature:', error.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('[Stripe Webhook] Processing event:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChanged(event.data.object as Stripe.Subscription)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
        
      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[Stripe Webhook] Error processing event:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('[Webhook] Processing checkout completion:', session.id)
  
  const userId = session.metadata?.supabase_user_id
  if (!userId) {
    console.error('[Webhook] No user ID in session metadata')
    return
  }

  // Update user's stripe_customer_id if not already set
  if (session.customer) {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: session.customer as string })
      .eq('user_id', userId)

    if (error) {
      console.error('[Webhook] Failed to update customer ID:', error)
    }
  }

  // Get subscription if this was a subscription checkout
  if (session.subscription && stripe) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    await handleSubscriptionChanged(subscription)
  }
}

async function handleSubscriptionChanged(subscription: Stripe.Subscription) {
  console.log('[Webhook] Processing subscription change:', subscription.id)
  
  const userId = subscription.metadata?.supabase_user_id
  if (!userId) {
    console.error('[Webhook] No user ID in subscription metadata')
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  const tier = priceId ? getTierFromPriceId(priceId) : null

  // Update provider profile with subscription info
  const { error } = await supabaseAdmin
    .from('provider_profiles')
    .update({
      subscription_status: subscription.status as 'active' | 'inactive' | 'past_due' | 'canceled',
      subscription_price_id: priceId,
      subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
    })
    .eq('provider_id', userId)

  if (error) {
    console.error('[Webhook] Failed to update provider subscription:', error)
  } else {
    console.log('[Webhook] Updated provider subscription:', {
      userId,
      status: subscription.status,
      tier,
      periodEnd: new Date(subscription.current_period_end * 1000).toISOString()
    })
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('[Webhook] Processing subscription deletion:', subscription.id)
  
  const userId = subscription.metadata?.supabase_user_id
  if (!userId) {
    console.error('[Webhook] No user ID in subscription metadata')
    return
  }

  // Update provider profile to remove subscription
  const { error } = await supabaseAdmin
    .from('provider_profiles')
    .update({
      subscription_status: 'canceled',
      subscription_price_id: null,
      subscription_current_period_end: null
    })
    .eq('provider_id', userId)

  if (error) {
    console.error('[Webhook] Failed to update provider after deletion:', error)
  } else {
    console.log('[Webhook] Updated provider after subscription cancellation:', userId)
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('[Webhook] Processing successful payment:', invoice.id)
  
  if (invoice.subscription && stripe) {
    // Refresh subscription data after successful payment
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    await handleSubscriptionChanged(subscription)
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('[Webhook] Processing failed payment:', invoice.id)
  
  const userId = invoice.subscription_details?.metadata?.supabase_user_id
  if (!userId) {
    console.error('[Webhook] No user ID in failed invoice')
    return
  }

  // Mark subscription as past_due (Stripe will also do this)
  if (invoice.subscription && stripe) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    await handleSubscriptionChanged(subscription)
  }

  // Could also send notification emails here
  console.log('[Webhook] Payment failed for user:', userId)
}