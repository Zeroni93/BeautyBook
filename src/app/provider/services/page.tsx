'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { getProviderServices, formatCurrency } from '@/lib/provider'

interface Service {
  id: string
  title: string
  description: string
  duration_minutes: number
  price_cents: number
  is_active: boolean
  category_id: string
}

export default function ProviderServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [deletingService, setDeletingService] = useState<string | null>(null)

  useEffect(() => {
    loadServices()
  }, [])

  const loadServices = async () => {
    try {
      setLoading(true)
      
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        window.location.href = '/auth/sign-in'
        return
      }

      setUser(authUser)

      const servicesData = await getProviderServices(authUser.id)
      setServices(servicesData as Service[])

    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteService = async (serviceId: string, serviceName: string) => {
    if (!user) return

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${serviceName}"? This action cannot be undone and will remove it from your public profile and prevent new bookings.`
    )

    if (!confirmed) return

    try {
      setDeletingService(serviceId)
      const supabase = createClient()
      
      const { error } = await (supabase as any)
        .from('services')
        .delete() // Hard delete
        .eq('id', serviceId)
        .eq('provider_id', user.id) // Ensure provider owns this service

      if (error) {
        console.error('Error deleting service:', error)
        alert('Failed to delete service. Please try again.')
        return
      }

      // Remove the deleted service from local state immediately
      setServices(services.filter(service => service.id !== serviceId))
      
    } catch (error) {
      console.error('Error deleting service:', error)
      alert('Failed to delete service. Please try again.')
    } finally {
      setDeletingService(null)
    }
  }

  const handleToggleService = async (serviceId: string, currentStatus: boolean) => {
    if (!user) return

    try {
      setDeletingService(serviceId)
      const supabase = createClient()
      
      const { error } = await (supabase as any)
        .from('services')
        .update({ is_active: !currentStatus })
        .eq('id', serviceId)
        .eq('provider_id', user.id) // Ensure provider owns this service

      if (error) {
        console.error('Error updating service:', error)
        alert('Failed to update service. Please try again.')
        return
      }

      // Update local state immediately
      setServices(services.map(service => 
        service.id === serviceId 
          ? { ...service, is_active: !currentStatus }
          : service
      ))
      
    } catch (error) {
      console.error('Error updating service:', error)
      alert('Failed to update service. Please try again.')
    } finally {
      setDeletingService(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="dark:text-slate-200">Loading services...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 shadow">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <Link href="/provider/dashboard" className="text-sm text-blue-600 hover:underline">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
              Manage Services
            </h1>
          </div>
          <Link href="/provider/services/new">
            <Button>Add New Service</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {services.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2 dark:text-slate-100">No Services Yet</h3>
                <p className="text-gray-600 dark:text-slate-400 mb-4">
                  Create your first service to start accepting bookings
                </p>
                <Link href="/provider/services/new">
                  <Button>Add Your First Service</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.id} className={!service.is_active ? 'opacity-60' : ''}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span className="dark:text-slate-100">{service.title}</span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      service.is_active ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {service.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-slate-400 mb-4 line-clamp-2">{service.description}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-slate-400">Duration:</span>
                      <span className="text-sm font-medium dark:text-slate-200">{service.duration_minutes} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-slate-400">Price:</span>
                      <span className="text-sm font-medium dark:text-slate-200">{formatCurrency(service.price_cents)}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Link href={`/provider/services/${service.id}/edit`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full">
                        Edit
                      </Button>
                    </Link>
                    <Button 
                      size="sm" 
                      variant={service.is_active ? 'outline' : 'default'}
                      onClick={() => handleToggleService(service.id, service.is_active)}
                      disabled={deletingService === service.id}
                    >
                      {deletingService === service.id ? 'Updating...' : (service.is_active ? 'Disable' : 'Enable')}
                    </Button>
                  </div>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    className="w-full mt-2"
                    onClick={() => handleDeleteService(service.id, service.title)}
                    disabled={deletingService === service.id}
                  >
                    {deletingService === service.id ? 'Deleting...' : 'Delete Service'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}