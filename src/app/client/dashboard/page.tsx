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
  const [favoriteProvider, setFavoriteProvider] = useState<Provider | null>(
    null
  )

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

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
          .select(
            `
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
          `
          )
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
        day: 'numeric',
      }),
      time: dateTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="dark:text-slate-200">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <header className="bg-white shadow dark:bg-slate-800">
        <div className="container mx-auto flex items-center justify-between px-4 py-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100 md:text-3xl">
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
          <Card className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
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
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100 md:text-2xl">
                    Welcome back, {profile?.display_name || 'Client'}!
                  </h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                    Manage your BeautyBook profile and bookings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Next Appointment Card */}
          {/* Next Appointment Card */}
          <Card className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
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
                      {formatDateTime(nextBooking.start_time).date},{' '}
                      {formatDateTime(nextBooking.start_time).time}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
                      <span className="text-sm font-medium text-white">
                        {(
                          nextBooking.provider.business_name ||
                          nextBooking.provider.display_name
                        ).charAt(0)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        {nextBooking.provider.business_name ||
                          nextBooking.provider.display_name}
                      </span>
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                        Verified
                      </span>
                    </div>
                  </div>
                  <Link href="/client/bookings">
                    <Button className="w-full">View Booking</Button>
                  </Link>
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="mb-4 text-gray-500 dark:text-slate-400">
                    No upcoming appointments
                  </p>
                  <Link href="/providers">
                    <Button className="w-full">Browse Providers</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Favorite Providers Card */}
          <Card className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold dark:text-slate-100">
                Favorite Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {favoriteProvider ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500">
                      <span className="font-medium text-white">
                        {(
                          favoriteProvider.business_name ||
                          favoriteProvider.display_name
                        ).charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">
                        {favoriteProvider.business_name ||
                          favoriteProvider.display_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">
                        {favoriteProvider.city && favoriteProvider.state
                          ? `${favoriteProvider.city}, ${favoriteProvider.state}`
                          : 'Location not specified'}
                      </p>
                    </div>
                  </div>
                  <Link href="/providers">
                    <Button className="w-full">Browse Providers</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-500 dark:text-slate-400">
                    You don&apos;t have any favorite providers yet
                  </p>
                  <Link href="/providers">
                    <Button className="w-full">Browse Providers</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Bookings Card */}
          <Card className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold dark:text-slate-100">
                My Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">
                Manage your appointments
              </p>
              <Link href="/client/bookings">
                <Button className="w-full">View Bookings</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recommended Services Card */}
          <Card className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold dark:text-slate-100">
                Recommended Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-slate-700">
                <h4 className="font-medium text-gray-900 dark:text-slate-100">
                  Facial
                </h4>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Skincare
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-slate-300">
                    45 min
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-slate-100">
                    $80.00
                  </span>
                </div>
              </div>
              <Link href="/providers" className="mt-4 block">
                <Button className="w-full" variant="outline">
                  Browse Services
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-semibold dark:text-slate-100">
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-gray-500 dark:text-slate-400">
                Configure your account settings
              </p>
              <Link href="/settings">
                <Button className="w-full">Go to Settings</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
