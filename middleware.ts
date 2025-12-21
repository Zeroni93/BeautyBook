import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieToSet = {
  name: string
  value: string
  options?: Record<string, unknown>
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshing the auth token
  await supabase.auth.getUser()

  return supabaseResponse
}

// Helper function to check onboarding status
async function getProviderOnboardingStatus(supabase: any, userId: string) {
  // Get provider data
  const { data: provider } = await supabase
    .from('provider_profiles')
    .select('subscription_status, business_name, address_line1, city')
    .eq('provider_id', userId)
    .single()

  if (!provider) {
    return { isComplete: false, nextStep: 'profile' }
  }

  // Check if provider has services and availability
  const { count: serviceCount } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true })
    .eq('provider_id', userId)
    .eq('is_active', true)

  const { count: availabilityCount } = await supabase
    .from('availability_rules')
    .select('*', { count: 'exact', head: true })
    .eq('provider_id', userId)
    .eq('is_active', true)

  const hasProfile = !!(
    provider.business_name &&
    provider.address_line1 &&
    provider.city
  )
  const hasActiveSubscription = provider.subscription_status === 'active'
  const hasService = (serviceCount || 0) > 0
  const hasAvailability = (availabilityCount || 0) > 0

  const isComplete =
    hasProfile && hasActiveSubscription && hasService && hasAvailability

  // Determine next step
  let nextStep: string | undefined
  if (!hasProfile) {
    nextStep = 'profile'
  } else if (!hasActiveSubscription) {
    nextStep = 'payments'
  } else if (!hasService) {
    nextStep = 'service'
  } else if (!hasAvailability) {
    nextStep = 'availability'
  }

  return { isComplete, nextStep }
}

export async function middleware(request: NextRequest) {
  // Public routes that don't need auth
  const publicRoutes = ['/', '/providers', '/auth']
  const isPublicRoute = publicRoutes.some(
    (route) =>
      request.nextUrl.pathname === route ||
      request.nextUrl.pathname.startsWith(`${route}/`)
  )

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Create Supabase client for auth check
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Not needed for read-only operations
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Allow anonymous users on public pages, redirect to auth for protected pages
  if (!user) {
    const redirectUrl = new URL('/auth/sign-in', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const userRole = profile?.role

  // Provider-specific onboarding logic
  if (request.nextUrl.pathname.startsWith('/provider/')) {
    if (userRole !== 'provider') {
      // Redirect client to client dashboard
      if (userRole === 'client') {
        return NextResponse.redirect(new URL('/client/dashboard', request.url))
      }
      // Unknown role, redirect to auth
      return NextResponse.redirect(
        new URL('/auth/sign-in?error=invalid-role', request.url)
      )
    }

    // Check onboarding status
    const onboardingStatus = await getProviderOnboardingStatus(
      supabase,
      user.id
    )

    const currentPath = request.nextUrl.pathname
    const isOnboardingPath =
      currentPath === '/provider/onboarding' ||
      currentPath.startsWith('/provider/onboarding/')
    const isStripeCallback = currentPath.startsWith('/provider/stripe/')

    // Onboarding guard logic
    if (
      !onboardingStatus.isComplete &&
      !isOnboardingPath &&
      !isStripeCallback
    ) {
      // Incomplete onboarding, redirect to onboarding with step
      let redirectPath = '/provider/onboarding'
      if (onboardingStatus.nextStep) {
        redirectPath += `?step=${onboardingStatus.nextStep}`
      }
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }

    if (onboardingStatus.isComplete && isOnboardingPath) {
      // Completed onboarding, redirect away from onboarding to dashboard
      return NextResponse.redirect(new URL('/provider/dashboard', request.url))
    }
  }

  // Client role access control
  if (request.nextUrl.pathname.startsWith('/client/')) {
    if (userRole !== 'client') {
      // Redirect provider to provider dashboard or onboarding
      if (userRole === 'provider') {
        const onboardingStatus = await getProviderOnboardingStatus(
          supabase,
          user.id
        )
        if (onboardingStatus.isComplete) {
          return NextResponse.redirect(
            new URL('/provider/dashboard', request.url)
          )
        } else {
          let redirectPath = '/provider/onboarding'
          if (onboardingStatus.nextStep) {
            redirectPath += `?step=${onboardingStatus.nextStep}`
          }
          return NextResponse.redirect(new URL(redirectPath, request.url))
        }
      }
      // Unknown role, redirect to auth
      return NextResponse.redirect(
        new URL('/auth/sign-in?error=invalid-role', request.url)
      )
    }
  }

  // Admin check
  if (request.nextUrl.pathname.startsWith('/admin/')) {
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (!adminUser) {
      // Redirect to appropriate dashboard based on role
      if (userRole === 'provider') {
        const onboardingStatus = await getProviderOnboardingStatus(
          supabase,
          user.id
        )
        if (onboardingStatus.isComplete) {
          return NextResponse.redirect(
            new URL('/provider/dashboard', request.url)
          )
        } else {
          let redirectPath = '/provider/onboarding'
          if (onboardingStatus.nextStep) {
            redirectPath += `?step=${onboardingStatus.nextStep}`
          }
          return NextResponse.redirect(new URL(redirectPath, request.url))
        }
      } else if (userRole === 'client') {
        return NextResponse.redirect(new URL('/client/dashboard', request.url))
      }
      return NextResponse.redirect(
        new URL('/?error=access-denied', request.url)
      )
    }
  }

  // Update session for authenticated requests
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all requests except static files and api routes
     * But exclude specific public routes in middleware logic
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
