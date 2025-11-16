'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import BookingModal from '@/components/BookingModal'

interface ProviderProfile {
  provider_id: string
  business_name: string
  bio: string | null
  city: string
  state: string
  zip: string
  address_line1: string
  address_line2: string | null
  hero_image_url: string | null
  is_verified: boolean
  profiles: {
    display_name: string
    avatar_url: string | null
  }
}

interface Service {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  price_cents: number
  category: {
    name: string
  }
}

export default function ProviderProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [preselectedServiceId, setPreselectedServiceId] = useState<string | undefined>(undefined)


  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const providerId = params.id as string
      if (!providerId) {
        setError('Provider ID not found')
        return
      }

      const supabase = createClient()

      // Load provider profile with user info
      const { data: profileData, error: profileError } = await supabase
        .from('provider_profiles')
        .select(`
          provider_id,
          business_name,
          bio,
          city,
          state,
          zip,
          address_line1,
          address_line2,
          hero_image_url,
          is_verified,
          created_at
        `)
        .eq('provider_id', providerId)
        .single()

      if (profileError) {
        console.error('Error loading provider profile (supabase error):', profileError)
        setError('Provider not found')
        return
      }

      if (!profileData) {
        console.warn('No provider profile found for provider_id:', providerId)
        setError('Provider not found')
        return
      }

      // Load the associated user profile separately
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', providerId)
        .single()

      if (userError) {
        console.error('Error loading user profile:', userError)
      }

      // Load availability exceptions separately
      const { data: availabilityExceptions, error: availabilityError } = await supabase
        .from('availability_exceptions')
        .select(`
          id,
          date,
          is_open,
          start_time,
          end_time,
          note
        `)
        .eq('provider_id', providerId)

      if (availabilityError) {
        console.error('Error loading availability exceptions:', availabilityError)
      }

      // Combine the data
      const combinedProfile = {
        ...(profileData as any),
        profiles: userProfile as any,
        availability_exceptions: availabilityExceptions || []
      }

      setProfile(combinedProfile as ProviderProfile)

      // Load provider services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          id,
          title,
          description,
          duration_minutes,
          price_cents,
          categories:category_id (
            name
          )
        `)
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('title')

      if (servicesError) {
        console.error('Error loading services:', servicesError)
      } else {
        setServices(servicesData?.map(service => {
          const typedService = service as any
          return {
            id: typedService.id,
            title: typedService.title,
            description: typedService.description,
            duration_minutes: typedService.duration_minutes,
            price_cents: typedService.price_cents,
            category: typedService.categories || { name: 'Uncategorized' }
          }
        }) || [])
      }

    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Failed to load provider profile')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) {
      return `${hours}h`
    }
    return `${hours}h ${remainingMinutes}min`
  }

  const openBookingModal = (serviceId?: string) => {
    setPreselectedServiceId(serviceId)
    setBookingModalOpen(true)
  }

  const closeBookingModal = () => {
    setBookingModalOpen(false)
    setPreselectedServiceId(undefined)
  }



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">😞</div>
            <CardTitle className="text-2xl dark:text-slate-100">Profile Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600 dark:text-slate-400">
              {error || 'The provider profile you\'re looking for doesn\'t exist.'}
            </p>
            <div className="space-y-2">
              <Link href="/providers" className="block">
                <Button className="w-full">
                  Browse All Providers
                </Button>
              </Link>
              <Link href="/" className="block">
                <Button variant="outline" className="w-full">
                  Go to Homepage
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <Link href="/providers" className="text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 mb-6 inline-block">
          ← Back to Providers
        </Link>

        <div className="space-y-8">
          {/* Profile Header */}
          <div>
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex-shrink-0">
                    {profile.hero_image_url ? (
                      <img 
                        src={profile.hero_image_url} 
                        alt={profile.business_name}
                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
                        {profile.business_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{profile.business_name}</h1>
                      {profile.is_verified && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    
                    <p className="text-lg text-gray-600 dark:text-slate-300 mb-2">
                      {profile.profiles.display_name}
                    </p>
                    
                    <p className="text-gray-600 dark:text-slate-400 mb-4">
                      📍 {profile.city}, {profile.state}
                    </p>
                    
                    {profile.bio && (
                      <p className="text-gray-700 dark:text-slate-300 leading-relaxed">
                        {profile.bio}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    <Button size="lg" className="px-8" onClick={() => openBookingModal()}>
                      Book Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Services */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Services</CardTitle>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
                  All communication and scheduling is managed through BeautyBook. Use the 'Book' button to request an appointment.
                </p>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-slate-400">No services available at this time.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {services.map((service) => (
                      <div key={service.id} className="p-4 border border-gray-200 dark:border-slate-600 rounded-lg hover:border-purple-300 dark:hover:border-purple-500 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-slate-100 mb-1">
                              {service.title}
                            </h3>
                            <p className="text-sm text-purple-600 dark:text-purple-400 mb-2">
                              {service.category.name}
                            </p>
                            {service.description && (
                              <p className="text-gray-600 dark:text-slate-300 text-sm mb-3">
                                {service.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                              <span>⏱️ {formatDuration(service.duration_minutes)}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-xl font-bold text-gray-900 dark:text-slate-100">
                              {formatCurrency(service.price_cents)}
                            </div>
                            <Button 
                              size="sm" 
                              className="mt-2"
                              onClick={() => openBookingModal(service.id)}
                            >
                              Book
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Booking Modal */}
        {profile && (
          <BookingModal
            isOpen={bookingModalOpen}
            onClose={closeBookingModal}
            providerId={profile.provider_id}
            providerName={profile.business_name}
            services={services}
            preselectedServiceId={preselectedServiceId}
          />
        )}
      </div>
    </div>
  )
}