'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { UserAvatar } from '@/components/UserAvatar'

interface Profile {
  display_name: string
  role: string
  avatar_url: string | null
}

interface Booking {
  id: string
  start_time: string
  end_time: string
  status: string
  provider: {
    display_name: string
    business_name?: string
  }
  service: {
    title: string
  }
}

interface Provider {
  id: string
  display_name: string
  business_name?: string
  city?: string
  state?: string
}

export default function ClientDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [nextBooking, setNextBooking] = useState<Booking | null>(null)
  const [favoriteProvider, setFavoriteProvider] = useState<Provider | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {        
        // Load profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, role, avatar_url')
          .eq('user_id', user.id)
          .single()
        
        if (profileData) {
          setProfile(profileData as Profile)
        }

        // Load next upcoming booking
        const { data: nextBookingData } = await supabase
          .from('bookings')
          .select(`
            id,
            start_time,
            end_time,
            status,
            provider:provider_id (
              display_name,
              business_name
            ),
            service:service_id (
              title
            )
          `)
          .eq('client_id', user.id)
          .gte('start_time', new Date().toISOString())
          .eq('status', 'confirmed')
          .order('start_time', { ascending: true })
          .limit(1)
          .single()

        if (nextBookingData) {
          setNextBooking(nextBookingData as Booking)
        }

        // For now, we'll use a placeholder for favorite providers
        // In a real implementation, this would query a favorites table
        const { data: providersData } = await supabase
          .from('profiles')
          .select('id, display_name, business_name, city, state')
          .eq('role', 'provider')
          .limit(1)
          .single()

        if (providersData) {
          setFavoriteProvider(providersData as Provider)
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const formatDateTime = (startTime: string) => {
    const dateTime = new Date(startTime)
    return {
      date: dateTime.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      time: dateTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="dark:text-slate-200">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 shadow">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-slate-100">
            BeautyBook
          </h1>
          <Button onClick={handleSignOut} variant="outline">
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Profile Header Section */}
        <div className="mb-8">
          <Card className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                {/* Avatar */}
                <UserAvatar
                  avatarUrl={profile?.avatar_url}
                  displayName={profile?.display_name || 'Client'}
                  size="md"
                />
                
                {/* Text */}
                <div>
                  <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-slate-100">
                    Welcome back, {profile?.display_name || 'Client'}!
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    Manage your BeautyBook profile and bookings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{/* Next Appointment Card */}
          {/* Next Appointment Card */}
          <Card className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold dark:text-slate-100">
                Next Appointment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextBooking ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-slate-100">
                      {nextBooking.service.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {formatDateTime(nextBooking.start_time).date}, {formatDateTime(nextBooking.start_time).time}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {(nextBooking.provider.business_name || nextBooking.provider.display_name).charAt(0)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {nextBooking.provider.business_name || nextBooking.provider.display_name}
                      </span>
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Verified
                      </span>
                    </div>
                  </div>
                  <Link href="/client/bookings">
                    <Button className="w-full">
                      View Booking
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 dark:text-slate-400 mb-4">
                    No upcoming appointments
                  </p>
                  <Link href="/providers">
                    <Button className="w-full">
                      Browse Providers
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Favorite Providers Card */}
          <Card className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold dark:text-slate-100">
                Favorite Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {favoriteProvider ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {(favoriteProvider.business_name || favoriteProvider.display_name).charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">
                        {favoriteProvider.business_name || favoriteProvider.display_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {favoriteProvider.city && favoriteProvider.state 
                          ? `${favoriteProvider.city}, ${favoriteProvider.state}`
                          : 'Location not specified'
                        }
                      </p>
                    </div>
                  </div>
                  <Link href="/providers">
                    <Button className="w-full">
                      Browse Providers
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-500 dark:text-slate-400">
                    You don't have any favorite providers yet
                  </p>
                  <Link href="/providers">
                    <Button className="w-full">
                      Browse Providers
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Bookings Card */}
          <Card className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold dark:text-slate-100">
                My Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                Manage your appointments
              </p>
              <Link href="/client/bookings">
                <Button className="w-full">
                  View Bookings
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recommended Services Card */}
          <Card className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg font-semibold dark:text-slate-100">
                Recommended Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-slate-100">Facial</h4>
                <p className="text-sm text-gray-500 dark:text-slate-400">Skincare</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600 dark:text-slate-300">45 min</span>
                  <span className="font-semibold text-gray-900 dark:text-slate-100">$80.00</span>
                </div>
              </div>
              <Link href="/providers" className="block mt-4">
                <Button className="w-full" variant="outline">
                  Browse Services
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-semibold dark:text-slate-100">
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                Configure your account settings
              </p>
              <Link href="/settings">
                <Button className="w-full">
                  Go to Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}