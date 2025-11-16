'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getProviderAvailability } from '@/lib/provider'

interface AvailabilityRule {
  id: string
  weekday: number
  start_time: string
  end_time: string
  buffer_minutes: number
  is_active: boolean
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function ProviderAvailabilityPage() {
  const [availability, setAvailability] = useState<AvailabilityRule[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadAvailability()
  }, [])

  const loadAvailability = async () => {
    try {
      setLoading(true)
      
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        window.location.href = '/auth/sign-in'
        return
      }

      setUser(authUser)

      const availabilityData = await getProviderAvailability(authUser.id)
      setAvailability(availabilityData as AvailabilityRule[])

    } catch (error) {
      console.error('Error loading availability:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="dark:text-slate-200">Loading availability...</div>
      </div>
    )
  }

  // Group availability by weekday
  const availabilityByDay = WEEKDAYS.reduce((acc, day, index) => {
    acc[index] = availability.filter(rule => rule.weekday === index)
    return acc
  }, {} as Record<number, AvailabilityRule[]>)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 shadow">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <Link href="/provider/dashboard" className="text-sm text-blue-600 hover:underline">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
              Manage Availability
            </h1>
          </div>
          <Button>Add Time Slot</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {availability.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2 dark:text-slate-100">No Availability Set</h3>
                <p className="text-gray-600 dark:text-slate-400 mb-4">
                  Set your working hours to start accepting bookings
                </p>
                <Button>Set Your Hours</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {WEEKDAYS.map((day, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span className="dark:text-slate-100">{day}</span>
                    <Button size="sm" variant="outline">Add Slot</Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {availabilityByDay[index].length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500 dark:text-slate-400">Closed</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availabilityByDay[index].map((rule) => (
                        <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded">
                          <div className="flex items-center space-x-4">
                            <div>
                              <span className="font-medium dark:text-slate-100">
                                {formatTime(rule.start_time)} - {formatTime(rule.end_time)}
                              </span>
                              {rule.buffer_minutes > 0 && (
                                <span className="text-sm text-gray-500 dark:text-slate-400 ml-2">
                                  ({rule.buffer_minutes}min buffer)
                                </span>
                              )}
                            </div>
                            <span className={`px-2 py-1 text-xs rounded ${
                              rule.is_active ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {rule.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">Edit</Button>
                            <Button size="sm" variant="destructive">Remove</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardTitle className="dark:text-slate-100">Exceptions & Special Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-slate-400 mb-4">No exceptions set</p>
                  <Button variant="outline">Add Exception</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}