'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/auth/client'
import { Database } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const serviceSchema = z.object({
  title: z.string().min(2, 'Service name is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  durationMinutes: z.number().min(15, 'Duration must be at least 15 minutes'),
  priceCents: z.number().min(100, 'Price must be at least $1.00'),
  isActive: z.boolean().default(true),
})

type ServiceForm = z.infer<typeof serviceSchema>
type Service = Database['public']['Tables']['services']['Row']
type Category = Database['public']['Tables']['categories']['Row']

interface User {
  id: string
  email?: string
}

interface ServiceFormProps {
  serviceId?: string
  mode: 'create' | 'edit'
}

export default function ServiceFormComponent({ serviceId, mode }: ServiceFormProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<ServiceForm>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
      durationMinutes: 60,
      priceCents: 5000,
      isActive: true,
    },
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      // Check auth
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/auth/sign-in')
        return
      }
      setUser(authUser)

      // Load categories
      const { data: categoriesData } = await supabase.from('categories').select('*').order('name')
      if (categoriesData) setCategories(categoriesData)

      // If editing, load service data
      if (mode === 'edit' && serviceId) {
        const { data: service, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .eq('provider_id', authUser.id) // Ensure provider owns this service
          .single()

        if (serviceError || !service) {
          setError('Service not found or you do not have permission to edit it')
          return
        }

        // Populate form with existing data
        const serviceData = service as Service
        form.setValue('title', serviceData.title)
        form.setValue('description', serviceData.description || '')
        form.setValue('categoryId', serviceData.category_id)
        form.setValue('durationMinutes', serviceData.duration_minutes)
        form.setValue('priceCents', serviceData.price_cents)
        form.setValue('isActive', serviceData.is_active || true)
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
      setError('Failed to load form data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: ServiceForm) => {
    if (!user) return
    
    try {
      setSaving(true)
      setError(null)
      const supabase = createClient()

      const serviceData = {
        provider_id: user.id,
        category_id: data.categoryId,
        title: data.title,
        description: data.description,
        duration_minutes: data.durationMinutes,
        price_cents: data.priceCents,
        is_active: data.isActive,
      }

      if (mode === 'create') {
        const { error } = await (supabase
          .from('services')
          .insert as any)(serviceData)
      } else {
        const { error } = await (supabase
          .from('services')
          .update as any)(serviceData)
          .eq('id', serviceId)
          .eq('provider_id', user.id) // Ensure provider owns this service
      }

      if (error) {
        console.error('Service save error:', error)
        setError('Failed to save service. Please try again.')
        return
      }

      // Success - redirect back to services page
      router.push('/provider/services')
      
    } catch (error) {
      console.error('Error saving service:', error)
      setError('Failed to save service. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 py-6">
            <Link href="/provider/services" className="text-sm text-blue-600 hover:underline">
              ← Back to Services
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Error</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold mb-2 text-red-600">Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Link href="/provider/services">
                <Button>Back to Services</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-6">
          <Link href="/provider/services" className="text-sm text-blue-600 hover:underline">
            ← Back to Services
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {mode === 'create' ? 'Add New Service' : 'Edit Service'}
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>
              {mode === 'create' ? 'Create a New Service' : 'Edit Service'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Service Name *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Haircut and Style"
                    {...form.register('title')}
                  />
                  {form.formState.errors.title && (
                    <p className="text-red-600 text-sm">{form.formState.errors.title.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="categoryId">Category *</Label>
                  <select
                    id="categoryId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    {...form.register('categoryId')}
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  {form.formState.errors.categoryId && (
                    <p className="text-red-600 text-sm">{form.formState.errors.categoryId.message}</p>
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
                  {...form.register('description')}
                />
                {form.formState.errors.description && (
                  <p className="text-red-600 text-sm">{form.formState.errors.description.message}</p>
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
                    placeholder="60"
                    {...form.register('durationMinutes', { valueAsNumber: true })}
                  />
                  {form.formState.errors.durationMinutes && (
                    <p className="text-red-600 text-sm">{form.formState.errors.durationMinutes.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="priceCents">Price (USD) *</Label>
                  <Input
                    id="priceCents"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="50.00"
                    defaultValue={form.watch('priceCents') ? (form.watch('priceCents') / 100).toFixed(2) : '50.00'}
                    onChange={(e) => {
                      const dollarValue = parseFloat(e.target.value) || 0
                      form.setValue('priceCents', Math.round(dollarValue * 100))
                    }}
                  />
                  {form.formState.errors.priceCents && (
                    <p className="text-red-600 text-sm">{form.formState.errors.priceCents.message}</p>
                  )}
                </div>
              </div>

              {mode === 'edit' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    {...form.register('isActive')}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isActive">Active (visible to clients)</Label>
                </div>
              )}

              <div className="flex space-x-4 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? (mode === 'create' ? 'Creating...' : 'Saving...') : (mode === 'create' ? 'Create Service' : 'Save Changes')}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push('/provider/services')}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}