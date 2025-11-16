'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/auth/client'
import { Database } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  getOnboardingStatus, 
  updateOnboardingStep,
  completeProfileStep,
  completeServiceStep,
  completeAvailabilityStep,
  OnboardingStep 
} from './actions'

// Type definitions
type UserProfile = Database['public']['Tables']['profiles']['Row']
type ProviderProfile = Database['public']['Tables']['provider_profiles']['Row']
type Service = Database['public']['Tables']['services']['Row']
type AvailabilityRule = Database['public']['Tables']['availability_rules']['Row']

interface OnboardingStatus {
  isComplete: boolean
  nextStep?: OnboardingStep
  currentSteps: Record<OnboardingStep, boolean>
  missingRequirements: string[]
}

interface User {
  id: string
  email?: string
}

// Schema definitions
const profileSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zip: z.string().min(5, 'Valid ZIP code is required'),
  addressLine1: z.string().min(5, 'Address is required'),
  addressLine2: z.string().optional(),
  bio: z.string().min(20, 'Bio must be at least 20 characters'),
})

const serviceSchema = z.object({
  title: z.string().min(2, 'Service name is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  durationMinutes: z.number().min(15, 'Duration must be at least 15 minutes'),
  priceCents: z.number().min(100, 'Price must be at least $1.00'),
})

type ProfileForm = z.infer<typeof profileSchema>
type ServiceForm = z.infer<typeof serviceSchema>

interface Category {
  id: string
  name: string
  slug: string
}

function OnboardingContent() {
  const searchParams = useSearchParams()
  const stepParam = searchParams.get('step') as OnboardingStep | null
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const router = useRouter()

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      businessName: '',
      city: '',
      state: '',
      zip: '',
      addressLine1: '',
      addressLine2: '',
      bio: '',
    },
  })

  const serviceForm = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
      durationMinutes: 60,
      priceCents: 5000, // $50.00
    },
  })

  const [availability, setAvailability] = useState({
    monday: { enabled: false, start: '09:00', end: '17:00' },
    tuesday: { enabled: false, start: '09:00', end: '17:00' },
    wednesday: { enabled: false, start: '09:00', end: '17:00' },
    thursday: { enabled: false, start: '09:00', end: '17:00' },
    friday: { enabled: false, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '17:00' },
    sunday: { enabled: false, start: '09:00', end: '17:00' },
  })

  useEffect(() => {
    checkAuthAndLoadData()
    fetchCategories()
  }, [])

  useEffect(() => {
    // Set current step based on URL parameter or onboarding status
    if (stepParam && ['profile', 'payments', 'service', 'availability'].includes(stepParam)) {
      setCurrentStep(stepParam)
    } else if (onboardingStatus?.nextStep) {
      setCurrentStep(onboardingStatus.nextStep)
    }
  }, [stepParam, onboardingStatus])

  const checkAuthAndLoadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/sign-in?redirect=/provider/onboarding')
      return
    }

    setUser(user)
    
    // Get onboarding status
    try {
      const status = await getOnboardingStatus(user.id)
      setOnboardingStatus(status)
      
      // If already complete, redirect to dashboard
      if (status.isComplete) {
        router.push('/provider/dashboard')
        return
      }
    } catch (error) {
      console.error('Error loading onboarding status:', error)
    }
    
    // Load existing provider profile data
    const { data: profile } = await supabase
      .from('provider_profiles')
      .select('*')
      .eq('provider_id', user.id)
      .single()

    if (profile) {
      // Pre-fill form with existing data
      const typedProfile = profile as ProviderProfile
      profileForm.reset({
        businessName: typedProfile.business_name || '',
        city: typedProfile.city || '',
        state: typedProfile.state || '',
        zip: typedProfile.zip || '',
        addressLine1: typedProfile.address_line1 || '',
        addressLine2: typedProfile.address_line2 || '',
        bio: typedProfile.bio || '',
      })
    }
  }

  const fetchCategories = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('categories').select('*').order('name')
    if (data) setCategories(data)
  }

  const handleProfileSubmit = async (data: ProfileForm) => {
    if (!user) return
    
    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await (supabase
        .from('provider_profiles')
        .upsert as any)({
          provider_id: user.id,
          business_name: data.businessName,
          city: data.city,
          state: data.state,
          zip: data.zip,
          address_line1: data.addressLine1,
          address_line2: data.addressLine2,
          bio: data.bio,
        })

      if (error) throw error

      // Update onboarding step
      const result = await completeProfileStep(user.id)
      if (result.success) {
        if (result.nextStep) {
          router.push(`/provider/onboarding?step=${result.nextStep}`)
        } else if (result.isComplete) {
          router.push('/provider/dashboard')
        }
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Error saving profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentsRedirect = () => {
    // For now, we'll simulate subscription completion
    // In a real app, this would redirect to Stripe Checkout
    alert('Redirecting to subscription setup... (This would open Stripe Checkout)')
    
    // Simulate subscription activation (normally handled by webhook)
    setTimeout(async () => {
      if (user) {
        const supabase = createClient()
        const { error } = await (supabase
          .from('provider_profiles')
          .update as any)({ subscription_status: 'active' })
          .eq('provider_id', user.id)
        
        if (!error) {
          router.push('/provider/onboarding?step=service')
        }
      }
    }, 2000)
  }

  const handleServiceSubmit = async (data: ServiceForm) => {
    if (!user) return
    
    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await (supabase
        .from('services')
        .insert as any)({
          provider_id: user.id,
          category_id: data.categoryId,
          title: data.title,
          description: data.description,
          duration_minutes: data.durationMinutes,
          price_cents: data.priceCents,
        })

      if (error) throw error

      // Update onboarding step
      const result = await completeServiceStep(user.id)
      if (result.success) {
        if (result.nextStep) {
          router.push(`/provider/onboarding?step=${result.nextStep}`)
        } else if (result.isComplete) {
          router.push('/provider/dashboard')
        }
      }
    } catch (error) {
      console.error('Error saving service:', error)
      alert('Error saving service. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAvailabilitySubmit = async () => {
    if (!user) return
    
    setLoading(true)
    const supabase = createClient()

    try {
      const availabilityRules = Object.entries(availability)
        .filter(([_, day]) => day.enabled)
        .map(([dayName, day]) => ({
          provider_id: user.id,
          weekday: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayName),
          start_time: day.start,
          end_time: day.end,
          is_active: true,
        }))

      if (availabilityRules.length === 0) {
        alert('Please select at least one day of availability')
        return
      }

      const { error: availabilityError } = await supabase
        .from('availability_rules')
        .insert(availabilityRules as any)

      if (availabilityError) throw availabilityError

      // Complete availability step
      const result = await completeAvailabilityStep(user.id)
      if (result.success) {
        // Show completion toast and redirect to dashboard
        alert('Setup complete! Welcome to Beauty Book.')
        router.push('/provider/dashboard')
      }
    } catch (error) {
      console.error('Error saving availability:', error)
      alert('Error saving availability. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const stepConfig = {
    profile: { number: 1, title: 'Profile Information', completed: onboardingStatus?.currentSteps?.profile },
    payments: { number: 2, title: 'Payment Setup', completed: onboardingStatus?.currentSteps?.payments },
    service: { number: 3, title: 'Add Service', completed: onboardingStatus?.currentSteps?.service },
    availability: { number: 4, title: 'Set Availability', completed: onboardingStatus?.currentSteps?.availability },
  }

  const currentStepConfig = stepConfig[currentStep]
  const orderedSteps: OnboardingStep[] = ['profile', 'payments', 'service', 'availability']

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Provider Onboarding</h1>
          <div className="flex items-center justify-between mb-8">
            {orderedSteps.map((stepKey, index) => {
              const step = stepConfig[stepKey]
              return (
                <div key={stepKey} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    step.completed ? 'bg-green-500' : 
                    stepKey === currentStep ? 'bg-blue-500' : 'bg-gray-300'
                  }`}>
                    {step.completed ? '✓' : step.number}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      stepKey === currentStep ? 'text-blue-600' : 
                      step.completed ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      Step {step.number}
                    </p>
                    <p className={`text-xs ${
                      stepKey === currentStep ? 'text-blue-600' : 
                      step.completed ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < orderedSteps.length - 1 && (
                    <div className={`hidden md:block w-16 h-0.5 ml-4 ${
                      step.completed ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          {currentStep === 'profile' && (
            <>
              <CardHeader>
                <CardTitle>Business Profile Information</CardTitle>
                <CardDescription>Tell us about your business and where you're located</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="businessName">Business Name *</Label>
                      <Input
                        id="businessName"
                        placeholder="Your Business Name"
                        {...profileForm.register('businessName')}
                      />
                      {profileForm.formState.errors.businessName && (
                        <p className="text-red-600 text-sm">{profileForm.formState.errors.businessName.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="addressLine1">Address *</Label>
                      <Input
                        id="addressLine1"
                        placeholder="123 Main St"
                        {...profileForm.register('addressLine1')}
                      />
                      {profileForm.formState.errors.addressLine1 && (
                        <p className="text-red-600 text-sm">{profileForm.formState.errors.addressLine1.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      placeholder="Suite, Unit, Apt (optional)"
                      {...profileForm.register('addressLine2')}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        placeholder="City"
                        {...profileForm.register('city')}
                      />
                      {profileForm.formState.errors.city && (
                        <p className="text-red-600 text-sm">{profileForm.formState.errors.city.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        placeholder="State"
                        {...profileForm.register('state')}
                      />
                      {profileForm.formState.errors.state && (
                        <p className="text-red-600 text-sm">{profileForm.formState.errors.state.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="zip">ZIP Code *</Label>
                      <Input
                        id="zip"
                        placeholder="12345"
                        {...profileForm.register('zip')}
                      />
                      {profileForm.formState.errors.zip && (
                        <p className="text-red-600 text-sm">{profileForm.formState.errors.zip.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">About Your Business *</Label>
                    <textarea
                      id="bio"
                      rows={4}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Describe your business, services, and what makes you special..."
                      {...profileForm.register('bio')}
                    />
                    {profileForm.formState.errors.bio && (
                      <p className="text-red-600 text-sm">{profileForm.formState.errors.bio.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Saving...' : 'Continue to Payment Setup'}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {currentStep === 'payments' && (
            <>
              <CardHeader>
                <CardTitle>Payment Setup</CardTitle>
                <CardDescription>Subscribe to our platform and set up payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Provider Subscription</h3>
                  <p className="text-gray-600 mb-2">
                    Subscribe to our platform to start accepting bookings
                  </p>
                  <div className="text-2xl font-bold text-blue-600 mb-6">
                    $5.00/month
                  </div>
                  
                  {!onboardingStatus?.currentSteps?.payments ? (
                    <Button onClick={handlePaymentsRedirect} disabled={loading} size="lg">
                      {loading ? 'Processing...' : 'Subscribe & Set Up Payments'}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full">
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Subscription active
                      </div>
                      <Button onClick={() => router.push('/provider/onboarding?step=service')} className="w-full">
                        Continue to Add Service
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 'service' && (
            <>
              <CardHeader>
                <CardTitle>Add Your First Service</CardTitle>
                <CardDescription>Create a service that clients can book</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={serviceForm.handleSubmit(handleServiceSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Service Name *</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Haircut and Style"
                        {...serviceForm.register('title')}
                      />
                      {serviceForm.formState.errors.title && (
                        <p className="text-red-600 text-sm">{serviceForm.formState.errors.title.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="categoryId">Category *</Label>
                      <select
                        id="categoryId"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        {...serviceForm.register('categoryId')}
                      >
                        <option value="">Select a category</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                      {serviceForm.formState.errors.categoryId && (
                        <p className="text-red-600 text-sm">{serviceForm.formState.errors.categoryId.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <textarea
                      id="description"
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Describe what's included in this service..."
                      {...serviceForm.register('description')}
                    />
                    {serviceForm.formState.errors.description && (
                      <p className="text-red-600 text-sm">{serviceForm.formState.errors.description.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="durationMinutes">Duration (minutes) *</Label>
                      <Input
                        id="durationMinutes"
                        type="number"
                        min="15"
                        step="15"
                        {...serviceForm.register('durationMinutes', { valueAsNumber: true })}
                      />
                      {serviceForm.formState.errors.durationMinutes && (
                        <p className="text-red-600 text-sm">{serviceForm.formState.errors.durationMinutes.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="price">Price ($) *</Label>
                      <Input
                        id="price"
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="50.00"
                        {...serviceForm.register('priceCents', { 
                          setValueAs: (value) => Math.round(parseFloat(value) * 100)
                        })}
                      />
                      {serviceForm.formState.errors.priceCents && (
                        <p className="text-red-600 text-sm">{serviceForm.formState.errors.priceCents.message}</p>
                      )}
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Adding Service...' : 'Continue to Availability'}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {currentStep === 'availability' && (
            <>
              <CardHeader>
                <CardTitle>Set Your Availability</CardTitle>
                <CardDescription>Choose the days and hours you're available for appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(availability).map(([day, schedule]) => (
                    <div key={day} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={day}
                          checked={schedule.enabled}
                          onChange={(e) => setAvailability(prev => ({
                            ...prev,
                            [day]: { ...prev[day as keyof typeof prev], enabled: e.target.checked }
                          }))}
                          className="w-4 h-4"
                        />
                        <label htmlFor={day} className="font-medium capitalize w-20">{day}</label>
                      </div>
                      
                      {schedule.enabled && (
                        <div className="flex items-center space-x-2">
                          <Input
                            type="time"
                            value={schedule.start}
                            onChange={(e) => setAvailability(prev => ({
                              ...prev,
                              [day]: { ...prev[day as keyof typeof prev], start: e.target.value }
                            }))}
                            className="w-24"
                          />
                          <span className="text-gray-500">to</span>
                          <Input
                            type="time"
                            value={schedule.end}
                            onChange={(e) => setAvailability(prev => ({
                              ...prev,
                              [day]: { ...prev[day as keyof typeof prev], end: e.target.value }
                            }))}
                            className="w-24"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={handleAvailabilitySubmit} 
                  className="w-full mt-6" 
                  disabled={loading || !Object.values(availability).some(day => day.enabled)}
                >
                  {loading ? 'Completing Setup...' : 'Complete Onboarding'}
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function ProviderOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading onboarding...</div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}