'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/auth/client'
import { getProviderAvailability } from '@/lib/provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

interface AvailabilityRule {
  id: string
  weekday: number
  start_time: string
  end_time: string
  buffer_minutes: number | null
  is_active: boolean | null
}

interface AvailabilityException {
  id: string
  date: string
  is_open: boolean
  start_time?: string
  end_time?: string
  note?: string
}

interface TimeSlot {
  datetime: Date
  display: string
  available: boolean
}

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  providerId: string
  providerName: string
  services: Service[]
  preselectedServiceId?: string
}

export default function BookingModal({
  isOpen,
  onClose,
  providerId,
  providerName,
  services,
  preselectedServiceId
}: BookingModalProps) {
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([])
  const [availabilityExceptions, setAvailabilityExceptions] = useState<AvailabilityException[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize with preselected service
  useEffect(() => {
    if (preselectedServiceId) {
      const service = services.find(s => s.id === preselectedServiceId)
      if (service) {
        setSelectedService(service)
      }
    }
  }, [preselectedServiceId, services])

  // Load availability when modal opens or service changes
  useEffect(() => {
    if (isOpen && providerId) {
      loadAvailability()
    }
  }, [isOpen, providerId])

  // Generate time slots when service changes
  useEffect(() => {
    if (selectedService && availabilityRules.length > 0) {
      generateTimeSlots()
    }
  }, [selectedService, availabilityRules, availabilityExceptions])

  const loadAvailability = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()

      // Load availability rules
      const rules = await getProviderAvailability(providerId)
      setAvailabilityRules(rules)

      // Load availability exceptions
      const { data: exceptions, error: exceptionsError } = await supabase
        .from('availability_exceptions')
        .select('*')
        .eq('provider_id', providerId)
        .gte('date', new Date().toISOString().split('T')[0]) // Only future/current dates

      if (exceptionsError) {
        console.error('Error loading availability exceptions:', exceptionsError)
      } else {
        setAvailabilityExceptions(exceptions || [])
      }
    } catch (error) {
      console.error('Error loading availability:', error)
      setError('Failed to load availability')
    } finally {
      setLoading(false)
    }
  }

  const generateTimeSlots = () => {
    if (!selectedService || availabilityRules.length === 0) {
      setTimeSlots([])
      return
    }

    const slots: TimeSlot[] = []
    const today = new Date()
    const serviceDurationMs = selectedService.duration_minutes * 60 * 1000

    // Generate slots for the next 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      date.setHours(0, 0, 0, 0)

      const weekday = date.getDay()
      const dateString = date.toISOString().split('T')[0]

      // Find availability rule for this weekday
      const rule = availabilityRules.find(r => r.weekday === weekday && (r.is_active === true || r.is_active === null))
      if (!rule) continue

      // Check for exceptions
      const exception = availabilityExceptions.find(e => e.date === dateString)
      if (exception && !exception.is_open) {
        continue // Day is closed due to exception
      }

      // Use exception times if available, otherwise use rule times
      const startTime = exception?.start_time || rule.start_time
      const endTime = exception?.end_time || rule.end_time

      if (!startTime || !endTime) continue

      // Parse start and end times
      const [startHour, startMinute] = startTime.split(':').map(Number)
      const [endHour, endMinute] = endTime.split(':').map(Number)

      // Generate time slots in 30-minute intervals
      const slotDuration = 30 * 60 * 1000 // 30 minutes
      let currentTime = new Date(date)
      currentTime.setHours(startHour, startMinute, 0, 0)

      const endDateTime = new Date(date)
      endDateTime.setHours(endHour, endMinute, 0, 0)

      while (currentTime < endDateTime) {
        // Check if slot has enough time for service + buffer
        const slotEndTime = new Date(currentTime.getTime() + serviceDurationMs)
        const bufferTime = (rule.buffer_minutes || 0) * 60 * 1000
        const slotEndWithBuffer = new Date(slotEndTime.getTime() + bufferTime)

        if (slotEndWithBuffer <= endDateTime && currentTime > new Date()) {
          // Check if this time slot conflicts with existing bookings (simplified)
          slots.push({
            datetime: new Date(currentTime),
            display: currentTime.toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }),
            available: true
          })
        }

        currentTime = new Date(currentTime.getTime() + slotDuration)
      }
    }

    setTimeSlots(slots)
  }

  const createBooking = async () => {
    if (!selectedService || !selectedTimeSlot) return

    try {
      setCreating(true)
      setError(null)

      const supabase = createClient()

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError('Please sign in to book an appointment. Redirecting to sign in page...')
        setTimeout(() => {
          window.location.href = '/auth/sign-in'
        }, 2000)
        return
      }

      // Calculate end time
      const endTime = new Date(selectedTimeSlot.datetime.getTime() + selectedService.duration_minutes * 60 * 1000)

      // Calculate fees (simplified - using 10% platform fee)
      const platformFeeCents = Math.round(selectedService.price_cents * 0.10)

      // Create booking
      const { error: bookingError } = await (supabase
        .from('bookings')
        .insert as any)({
          client_id: user.id,
          provider_id: providerId,
          service_id: selectedService.id,
          start_time: selectedTimeSlot.datetime.toISOString(),
          end_time: endTime.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          status: 'pending',
          total_price_cents: selectedService.price_cents,
          platform_fee_cents: platformFeeCents,
          payment_status: 'unpaid'
        })

      if (bookingError) {
        console.error('Error creating booking:', bookingError)
        setError('Failed to create booking. Please try again.')
        return
      }

      // Success
      alert('Booking created successfully! You will receive a confirmation email.')
      onClose()
      
    } catch (error) {
      console.error('Error creating booking:', error)
      setError('Failed to create booking. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Book Appointment with {providerName}
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Service Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Select Service</h3>
            <div className="grid gap-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedService?.id === service.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedService(service)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium">{service.title}</h4>
                      <p className="text-sm text-purple-600">{service.category.name}</p>
                      {service.description && (
                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                      )}
                      <div className="text-sm text-gray-500 mt-2">
                        ⏱️ {formatDuration(service.duration_minutes)}
                      </div>
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(service.price_cents)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          {selectedService && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Select Time</h3>
              {loading ? (
                <div className="text-center py-4">Loading available times...</div>
              ) : timeSlots.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No available times found. Please try again later.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                  {timeSlots.slice(0, 50).map((slot, index) => (
                    <Button
                      key={index}
                      variant={selectedTimeSlot === slot ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTimeSlot(slot)}
                      className="text-xs"
                    >
                      {slot.display}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
              {error}
            </div>
          )}

          {/* Booking Summary and Confirm */}
          {selectedService && selectedTimeSlot && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Service:</span>
                  <span>{selectedService.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{formatDuration(selectedService.duration_minutes)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date & Time:</span>
                  <span>{selectedTimeSlot.display}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedService.price_cents)}</span>
                </div>
              </div>
              <Button 
                className="w-full mt-4" 
                onClick={createBooking}
                disabled={creating}
              >
                {creating ? 'Creating Booking...' : 'Confirm Booking'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}