'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import { Database } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getProviderReadiness } from '@/app/provider/onboarding/actions'

interface DashboardStats {
  todayBookings: number
  upcomingBookings: number
  weeklyEarnings: number
  monthlyEarnings: number
}

interface OnboardingStatus {
  isReady: boolean
  missingSubscription: boolean
  missingService: boolean
  missingAvailability: boolean
  missingProfile: boolean
}

export default function ProviderDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0,
    upcomingBookings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0
  })
  const [todaysBookings, setTodaysBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)

  const handleSubscriptionClick = async () => {
    try {
      setSubscriptionLoading(true)
      setSubscriptionError(null)

      if (process.env.NODE_ENV === 'development') {
        console.log('[Dashboard] Opening subscription portal...')
      }

      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const responseData = await response.json()

      if (process.env.NODE_ENV === 'development') {
        console.log('[Dashboard] Portal response:', { 
          status: response.status, 
          ok: response.ok,
          hasUrl: !!responseData.url,
          error: responseData.error 
        })
      }
      
      if (!response.ok) {
        // Step 7: Show the exact server error message
        const errorMessage = responseData.error || 'Failed to create portal session'
        throw new Error(errorMessage)
      }
      
      const { url } = responseData
      if (url) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Dashboard] Redirecting to portal:', url)
        }
        window.location.href = url
      } else {
        throw new Error('Stripe did not return a portal URL.')
      }
    } catch (error: any) {
      console.error('[Dashboard] Error opening portal:', error)
      
      // Step 7: Map common server errors to helpful text
      let userFriendlyMessage = error.message
      
      if (error.message.includes('is missing')) {
        // Environment variable error - pass through as is
        userFriendlyMessage = error.message
      } else if (error.message.includes('Unauthorized')) {
        userFriendlyMessage = 'Please sign in to access billing settings.'
      } else if (error.message.includes('not found')) {
        userFriendlyMessage = 'Account not found. Please contact support.'
      } else if (!error.message || error.message === 'Failed to create portal session') {
        userFriendlyMessage = 'Unable to open billing settings. Please try again.'
      }
      
      setSubscriptionError(userFriendlyMessage)
    } finally {
      setSubscriptionLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        window.location.href = '/auth/sign-in'
        return
      }

      setUser(authUser)

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single()

      setProfile(profileData)

      // Check onboarding status using new system
      try {
        const readiness = await getProviderReadiness(authUser.id)
        setOnboardingStatus(readiness)
      } catch (error) {
        console.error('Error loading onboarding status:', error)
        setOnboardingStatus({
          isReady: false,
          missingSubscription: true,
          missingService: true,
          missingAvailability: true,
          missingProfile: true
        })
      }

      // Load today's bookings (only future appointments)
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toISOString()
      const { data: todayBookings } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(title),
          client:profiles!bookings_client_id_fkey(display_name)
        `)
        .eq('provider_id', authUser.id)
        .gte('start_time', now) // Only future bookings
        .lt('start_time', today + 'T23:59:59Z')
        .in('status', ['pending', 'confirmed']) // Only active bookings, not completed ones
        .order('start_time')

      setTodaysBookings(todayBookings || [])

      // Load upcoming bookings (next 7 days)
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const { data: upcomingBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('provider_id', authUser.id)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', nextWeek.toISOString())

      // Mock earnings for now (would need actual payout data)
      setStats({
        todayBookings: todayBookings?.length || 0,
        upcomingBookings: upcomingBookings?.length || 0,
        weeklyEarnings: 0, // TODO: Calculate from actual bookings/payouts
        monthlyEarnings: 0 // TODO: Calculate from actual bookings/payouts
      })

    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const markAppointmentCompleted = async (bookingId: string) => {
    try {
      const supabase = createClient()
      
      const { error } = await (supabase
        .from('bookings') as any)
        .update({ status: 'completed' })
        .eq('id', bookingId)
        .eq('provider_id', user.id) // Ensure provider can only update their own bookings

      if (error) {
        console.error('Error updating booking:', error)
        alert('Failed to mark appointment as completed. Please try again.')
        return
      }

      // Remove the completed booking from local state
      setTodaysBookings(prev => prev.filter(booking => booking.id !== bookingId))
      
      // Update stats
      setStats(prev => ({
        ...prev,
        todayBookings: prev.todayBookings - 1
      }))

    } catch (error) {
      console.error('Error marking appointment as completed:', error)
      alert('Failed to mark appointment as completed. Please try again.')
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const formatDateTime = (dateTimeString: string) => {
    return new Date(dateTimeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="dark:text-slate-200">Loading dashboard...</div>
      </div>
    )
  }

  // Show onboarding banner if not ready
  const showOnboardingBanner = onboardingStatus && !onboardingStatus.isReady

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 shadow">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Provider Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-slate-400">
              Welcome, {profile?.display_name || 'Provider'}!
            </span>
            <Button onClick={handleSignOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Onboarding Banner with Checklist */}
        {showOnboardingBanner && onboardingStatus && (
          <Card className="mb-8 border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-300">
                    Complete Your Setup
                  </h3>
                  <p className="text-orange-600 dark:text-orange-400 mt-1 mb-4">
                    You need to complete your provider setup before you can accept bookings.
                  </p>
                  
                  {/* Checklist with deep links */}
                  <div className="space-y-2">
                    {onboardingStatus.missingProfile && (
                      <Link href="/provider/onboarding?step=profile" className="block">
                        <div className="flex items-center text-sm text-orange-700 hover:text-orange-800 hover:underline">
                          <span className="mr-2">❌</span>
                          Complete business profile
                        </div>
                      </Link>
                    )}
                    
                    {onboardingStatus.missingSubscription && (
                      <Link href="/provider/onboarding?step=payments" className="block">
                        <div className="flex items-center text-sm text-orange-700 hover:text-orange-800 hover:underline">
                          <span className="mr-2">❌</span>
                          Set up subscription and payments
                        </div>
                      </Link>
                    )}
                    
                    {onboardingStatus.missingService && (
                      <Link href="/provider/onboarding?step=service" className="block">
                        <div className="flex items-center text-sm text-orange-700 hover:text-orange-800 hover:underline">
                          <span className="mr-2">❌</span>
                          Create at least one service
                        </div>
                      </Link>
                    )}
                    
                    {onboardingStatus.missingAvailability && (
                      <Link href="/provider/onboarding?step=availability" className="block">
                        <div className="flex items-center text-sm text-orange-700 hover:text-orange-800 hover:underline">
                          <span className="mr-2">❌</span>
                          Set up availability schedule
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
                
                <Link href="/provider/onboarding">
                  <Button className="bg-orange-600 hover:bg-orange-700 ml-4">
                    Complete Setup
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Banner when onboarding is complete */}
        {onboardingStatus?.isReady && (
          <Card className="mb-8 border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-4">
              <div className="flex items-center">
                <span className="mr-3 text-green-600 dark:text-green-400">✅</span>
                <div>
                  <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">
                    Setup Complete!
                  </h3>
                  <p className="text-green-600 dark:text-green-400 text-sm">
                    You're ready to accept bookings and grow your business.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-slate-400">
                Today's Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-slate-100">{stats.todayBookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-slate-400">
                Upcoming (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-slate-100">{stats.upcomingBookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-slate-400">
                This Week's Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(stats.weeklyEarnings)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-slate-400">
                This Month's Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(stats.monthlyEarnings)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="dark:text-slate-100">Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/provider/services">
                  <Button 
                    variant="outline" 
                    className="w-full h-20 flex flex-col items-center justify-center"
                  >
                    <span className="text-lg">📋</span>
                    <span className="text-sm">Services</span>
                  </Button>
                </Link>

                <Link href="/provider/availability">
                  <Button 
                    variant="outline" 
                    className="w-full h-20 flex flex-col items-center justify-center"
                  >
                    <span className="text-lg">📅</span>
                    <span className="text-sm">Availability</span>
                  </Button>
                </Link>

                <Link href="/provider/gallery">
                  <Button 
                    variant="outline" 
                    className="w-full h-20 flex flex-col items-center justify-center"
                  >
                    <span className="text-lg">🖼️</span>
                    <span className="text-sm">Gallery</span>
                  </Button>
                </Link>

                <Link href="/provider/payouts">
                  <Button 
                    variant="outline" 
                    className="w-full h-20 flex flex-col items-center justify-center"
                  >
                    <span className="text-lg">💰</span>
                    <span className="text-sm">Payouts</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Today's Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="dark:text-slate-100">Today's Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {todaysBookings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-slate-400">No appointments today</p>
                  <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                    {showOnboardingBanner 
                      ? "Complete your setup to start accepting bookings!"
                      : "Take some time to relax or work on your business!"
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaysBookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded">
                      <div className="flex-1">
                        <div className="font-medium dark:text-slate-100">
                          {(booking.service as any)?.title || 'Service'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-slate-400">
                          {(booking.client as any)?.display_name || 'Client'}
                        </div>
                      </div>
                      <div className="text-right mr-3">
                        <div className="text-sm font-medium dark:text-slate-100">
                          {formatDateTime(booking.start_time)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          {booking.status}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAppointmentCompleted(booking.id)}
                          className="text-xs"
                        >
                          Mark Completed
                        </Button>
                      </div>
                    </div>
                  ))}
                  {todaysBookings.length > 5 && (
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm">
                        View All ({todaysBookings.length})
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="dark:text-slate-100">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-slate-400">Profile Status:</span>
                  <span className={`text-sm font-medium ${
                    onboardingStatus?.isReady ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                  }`}>
                    {onboardingStatus?.isReady ? 'Complete' : 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-slate-400">Booking Status:</span>
                  <span className={`text-sm font-medium ${
                    showOnboardingBanner ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                  }`}>
                    {showOnboardingBanner ? 'Disabled' : 'Active'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="dark:text-slate-100">Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/provider/account/profile">
                    <span className="text-sm">Edit Profile</span>
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleSubscriptionClick}
                  disabled={subscriptionLoading}
                  title={profile?.subscription_status ? `Status: ${profile.subscription_status}` : undefined}
                >
                  {subscriptionLoading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span className="text-sm">Opening...</span>
                    </div>
                  ) : (
                    <span className="text-sm">Subscription</span>
                  )}
                </Button>
                {subscriptionError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
                    <p className="text-sm text-red-700 dark:text-red-300">{subscriptionError}</p>
                    <button
                      onClick={() => setSubscriptionError(null)}
                      className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 mt-1"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/settings">
                    <span className="text-sm">Settings</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="dark:text-slate-100">Help & Support</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/docs">
                    <span className="text-sm">Documentation</span>
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={"/support/contact" as any}>
                    <span className="text-sm">Contact Support</span>
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={"/support/community" as any}>
                    <span className="text-sm">Community</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}