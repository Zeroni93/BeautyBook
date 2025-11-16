'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/auth/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface Provider {
  provider_id: string
  business_name: string
  city: string
  state: string
  bio: string | null
  is_verified: boolean
  hero_image_url: string | null
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

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [searchCity, setSearchCity] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [minRating, setMinRating] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')

  const categories = ['Hair', 'Nails', 'Makeup', 'Skincare', 'Lashes & Brows']
  const priceRanges = [
    { label: 'Under $50', value: '0-50' },
    { label: '$50 - $100', value: '50-100' },
    { label: '$100 - $200', value: '100-200' },
    { label: 'Over $200', value: '200-999999' }
  ]

  useEffect(() => {
    fetchUserRole()
  }, [])

  useEffect(() => {
    fetchProviders()
  }, [searchCity, selectedCategory, priceRange, minRating])

  const fetchUserRole = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()
      
      setUserRole((profile as any)?.role || null)
    }
  }

  const fetchProviders = async () => {
    setLoading(true)
    const supabase = createClient()
    
    try {
      let query = supabase
        .from('provider_profiles')
        .select(`
          provider_id,
          business_name,
          city,
          state,
          bio,
          is_verified,
          hero_image_url
        `)
        .eq('is_verified', true)

      if (searchCity) {
        query = query.ilike('city', `%${searchCity}%`)
      }

      const { data: providerData, error: providerError } = await query

      if (providerError) {
        console.error('Error fetching providers:', providerError)
        setProviders([])
      } else {
        setProviders(providerData || [])
      }

      // Fetch services with category filter
      let serviceQuery = supabase
        .from('services')
        .select(`
          id,
          title,
          description,
          duration_minutes,
          price_cents,
          category:categories(name)
        `)
        .eq('is_active', true)

      if (selectedCategory) {
        serviceQuery = serviceQuery.eq('categories.slug', selectedCategory.toLowerCase().replace(' & ', '-').replace(' ', '-'))
      }

      if (priceRange) {
        const [min, max] = priceRange.split('-').map(Number)
        serviceQuery = serviceQuery.gte('price_cents', min * 100).lte('price_cents', max * 100)
      }

      const { data: serviceData, error: serviceError } = await serviceQuery

      if (serviceError) {
        console.error('Error fetching services:', serviceError)
        setServices([])
      } else {
        setServices(serviceData || [])
      }
    } catch (error) {
      console.error('Error in fetch:', error)
      setProviders([])
      setServices([])
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const getBackUrl = () => {
    if (userRole === 'provider') {
      return '/provider/dashboard'
    } else if (userRole === 'client') {
      return '/client/dashboard'
    }
    return '/' // Fallback to public homepage for unauthenticated users
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        <Link href={getBackUrl()} className="text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200">
          ← Back to Home
        </Link>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">Find Beauty Providers</h1>
          <p className="text-gray-600 dark:text-slate-300">Discover top-rated beauty professionals in your area</p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="search-city">City/ZIP</Label>
              <Input
                id="search-city"
                placeholder="Enter city or ZIP code"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="flex h-10 w-full rounded-md border border-input bg-background dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 px-3 py-2 text-sm ring-offset-background"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="price-range">Price Range</Label>
              <select
                id="price-range"
                className="flex h-10 w-full rounded-md border border-input bg-background dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 px-3 py-2 text-sm ring-offset-background"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
              >
                <option value="">Any Price</option>
                {priceRanges.map(range => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="rating">Min Rating</Label>
              <select
                id="rating"
                className="flex h-10 w-full rounded-md border border-input bg-background dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 px-3 py-2 text-sm ring-offset-background"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
              >
                <option value="">Any Rating</option>
                <option value="4">4+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="5">5 Stars</option>
              </select>
            </div>

            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={fetchProviders} className="w-full md:w-auto">
              Search Providers
            </Button>
          </div>
        </div>

        {/* Results Section */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-slate-400">Loading providers...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {providers.length > 0 ? (
              <div>
                <h2 className="text-2xl font-semibold dark:text-slate-100 mb-4">Available Providers ({providers.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {providers.map(provider => (
                    <Card key={provider.provider_id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          {provider.hero_image_url ? (
                            <img 
                              src={provider.hero_image_url} 
                              alt={provider.business_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-white font-bold">
                              {provider.business_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-lg dark:text-slate-100">{provider.business_name}</CardTitle>
                            <p className="text-sm text-gray-600 dark:text-slate-400">{provider.city}, {provider.state}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {provider.bio && (
                          <p className="text-gray-700 dark:text-slate-300 text-sm mb-4 line-clamp-3">{provider.bio}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                            Verified
                          </span>
                          <Link href={`/providers/${provider.provider_id}`}>
                            <Button size="sm">View Profile</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">No providers found</h3>
                <p className="text-gray-600 dark:text-slate-400 mb-4">Try adjusting your search criteria or browse all available providers.</p>
                <Button onClick={() => {
                  setSearchCity('')
                  setSelectedCategory('')
                  setPriceRange('')
                  setMinRating('')
                  setSelectedDate('')
                  setSelectedTime('')
                }}>
                  Clear Filters
                </Button>
              </div>
            )}

            {services.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl font-semibold dark:text-slate-100 mb-4">Popular Services</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {services.slice(0, 8).map(service => (
                    <Card key={service.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <h4 className="font-medium dark:text-slate-100 mb-1">{service.title}</h4>
                        {service.description && (
                          <p className="text-sm text-gray-600 dark:text-slate-400 mb-2 line-clamp-2">{service.description}</p>
                        )}
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500 dark:text-slate-400">{service.duration_minutes} min</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">{formatPrice(service.price_cents)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}