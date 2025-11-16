import { createBrowserClient } from '@/lib/supabase'

export interface OnboardingStatus {
  hasConnect: boolean
  hasActiveSub: boolean
  hasService: boolean
  hasAvailability: boolean
  complete: boolean
  dbStatus: 'not_started' | 'in_progress' | 'completed'
}

export async function getProviderOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const supabase = createBrowserClient()

  try {
    // Check if provider profile exists and get onboarding status
    const { data: profile } = await supabase
      .from('provider_profiles')
      .select('stripe_connect_id, subscription_status')
      .eq('provider_id', userId)
      .single()

    const hasConnect = !!(profile?.stripe_connect_id)
    const hasActiveSub = profile?.subscription_status === 'active'
    // TODO: Add onboarding_status once migration is applied
    const dbStatus = 'not_started' as 'not_started' | 'in_progress' | 'completed'

    // Check if provider has at least one service
    const { count: serviceCount } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', userId)
      .eq('is_active', true)

    const hasService = (serviceCount || 0) > 0

    // Check if provider has at least one availability rule
    const { count: availabilityCount } = await supabase
      .from('availability_rules')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', userId)
      .eq('is_active', true)

    const hasAvailability = (availabilityCount || 0) > 0

    const complete = hasConnect && hasActiveSub && hasService && hasAvailability

    return {
      hasConnect,
      hasActiveSub,
      hasService,
      hasAvailability,
      complete,
      dbStatus: dbStatus as 'not_started' | 'in_progress' | 'completed'
    }
  } catch (error) {
    console.error('Error checking provider onboarding status:', error)
    return {
      hasConnect: false,
      hasActiveSub: false,
      hasService: false,
      hasAvailability: false,
      complete: false,
      dbStatus: 'not_started'
    }
  }
}

export async function requireProviderCompleteOnboarding(userId: string): Promise<string | null> {
  const status = await getProviderOnboardingStatus(userId)
  
  if (!status.complete) {
    return '/provider/onboarding'
  }
  
  return null
}

export async function updateOnboardingStatus(
  userId: string, 
  status: 'not_started' | 'in_progress' | 'completed'
): Promise<boolean> {
  const supabase = createBrowserClient()

  try {
    // For now, just return true since the column doesn't exist yet
    // TODO: Uncomment once migration is applied
    /*
    const { error } = await supabase
      .from('provider_profiles')
      .update({ onboarding_status: status })
      .eq('provider_id', userId)

    if (error) {
      console.error('Error updating onboarding status:', error)
      return false
    }
    */

    console.log(`Would update onboarding status for ${userId} to ${status}`)
    return true
  } catch (error) {
    console.error('Error updating onboarding status:', error)
    return false
  }
}

export async function completeOnboarding(userId: string): Promise<boolean> {
  const status = await getProviderOnboardingStatus(userId)
  
  if (status.complete) {
    return await updateOnboardingStatus(userId, 'completed')
  }
  
  return false
}

export async function getProviderProfile(userId: string) {
  const supabase = createBrowserClient()

  try {
    const { data: profile, error } = await supabase
      .from('provider_profiles')
      .select(`
        *,
        profiles:user_id (
          display_name,
          phone,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return profile
  } catch (error) {
    console.error('Error fetching provider profile:', error)
    return null
  }
}

export async function getProviderServices(userId: string) {
  const supabase = createBrowserClient()

  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('provider_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return services || []
  } catch (error) {
    console.error('Error fetching provider services:', error)
    return []
  }
}

export async function getProviderAvailability(userId: string) {
  const supabase = createBrowserClient()

  try {
    const { data: availability, error } = await supabase
      .from('availability_rules')
      .select('*')
      .eq('provider_id', userId)
      .order('weekday', { ascending: true })

    if (error) {
      throw error
    }

    return availability || []
  } catch (error) {
    console.error('Error fetching provider availability:', error)
    return []
  }
}

export async function getProviderBookings(
  userId: string, 
  options: {
    startDate?: string
    endDate?: string
    status?: string
    limit?: number
    offset?: number
  } = {}
) {
  const supabase = createBrowserClient()

  try {
    let query = supabase
      .from('bookings')
      .select(`
        id,
        start_time,
        end_time,
        status,
        total_price_cents,
        notes,
        client:client_id (
          display_name,
          phone
        ),
        service:service_id (
          title,
          duration_minutes,
          price_cents
        )
      `)
      .eq('provider_id', userId)

    if (options.startDate) {
      query = query.gte('start_time', options.startDate)
    }

    if (options.endDate) {
      query = query.lte('start_time', options.endDate)
    }

    if (options.status) {
      query = query.eq('status', options.status as any)
    }

    query = query
      .order('start_time', { ascending: true })

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    const { data: bookings, error } = await query

    if (error) {
      throw error
    }

    return bookings || []
  } catch (error) {
    console.error('Error fetching provider bookings:', error)
    return []
  }
}

export async function getProviderEarnings(userId: string, days: number = 7) {
  const supabase = createBrowserClient()

  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data: earnings, error } = await supabase
      .from('bookings')
      .select('total_price_cents, platform_fee_cents')
      .eq('provider_id', userId)
      .eq('status', 'completed')
      .gte('start_time', startDate.toISOString())

    if (error) {
      throw error
    }

    const totalRevenue = earnings?.reduce((sum: number, booking: any) => {
      return sum + (booking.total_price_cents || 0)
    }, 0) || 0

    const totalFees = earnings?.reduce((sum: number, booking: any) => {
      return sum + (booking.platform_fee_cents || 0)
    }, 0) || 0

    const totalEarnings = totalRevenue - totalFees

    return {
      totalEarnings,
      totalRevenue,
      totalFees,
      bookingCount: earnings?.length || 0
    }
  } catch (error) {
    console.error('Error fetching provider earnings:', error)
    return {
      totalEarnings: 0,
      totalRevenue: 0,
      totalFees: 0,
      bookingCount: 0
    }
  }
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100) // Amount stored in cents
}

export function formatDateTime(date: string, time?: string): string {
  const dateTime = time ? new Date(`${date}T${time}`) : new Date(date)
  return dateTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(time && {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  })
}