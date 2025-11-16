import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // Only available in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Environment check only available in development mode' },
      { status: 404 }
    )
  }

  const envStatus = {
    // Required for all environments
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing',
    
    // Required for server operations (webhooks/admin)
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing',
    
    // Required for payments
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY ? 'present' : 'missing',
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET ? 'present' : 'missing',
    
    // Additional important vars
    NEXT_PUBLIC_SITE_URL: !!process.env.NEXT_PUBLIC_SITE_URL ? 'present' : 'missing',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'present' : 'missing',
  }

  const criticalMissing = []
  const serverOnlyMissing = []
  
  // Check critical environment variables
  if (envStatus.NEXT_PUBLIC_SUPABASE_URL === 'missing') {
    criticalMissing.push('NEXT_PUBLIC_SUPABASE_URL')
  }
  if (envStatus.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'missing') {
    criticalMissing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  
  // Check server-only variables
  if (envStatus.SUPABASE_SERVICE_ROLE_KEY === 'missing') {
    serverOnlyMissing.push('SUPABASE_SERVICE_ROLE_KEY (needed for webhooks/admin only)')
  }
  if (envStatus.STRIPE_SECRET_KEY === 'missing') {
    serverOnlyMissing.push('STRIPE_SECRET_KEY')
  }
  if (envStatus.STRIPE_WEBHOOK_SECRET === 'missing') {
    serverOnlyMissing.push('STRIPE_WEBHOOK_SECRET')
  }

  return NextResponse.json({
    status: 'ok',
    environment: envStatus,
    warnings: {
      critical: criticalMissing.length > 0 ? criticalMissing : null,
      serverOnly: serverOnlyMissing.length > 0 ? serverOnlyMissing : null,
    },
    message: criticalMissing.length > 0 
      ? 'Critical environment variables missing - app will not function'
      : serverOnlyMissing.length > 0 
      ? 'Some server-only features may not work (webhooks/admin)'
      : 'All environment variables configured correctly'
  })
}