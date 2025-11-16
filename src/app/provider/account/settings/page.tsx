'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface SettingsData {
  email_notifications_enabled: boolean
  timezone: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    email_notifications_enabled: true,
    timezone: 'America/New_York'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [availableFields, setAvailableFields] = useState({
    notifications: false,
    timezone: false
  })
  const router = useRouter()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      // Check if user is provider
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if ((profile as any)?.role !== 'provider') {
        router.push('/')
        return
      }

      // Try to load settings from provider_profiles first
      const { data: providerSettings, error: providerError } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('provider_id', user.id)
        .single()

      // Check what fields exist by trying to query them
      if (providerSettings) {
        const hasNotifications = 'email_notifications_enabled' in (providerSettings as any)
        const hasTimezone = 'timezone' in (providerSettings as any)
        
        setAvailableFields({
          notifications: hasNotifications,
          timezone: hasTimezone
        })

        if (hasNotifications || hasTimezone) {
          setSettings({
            email_notifications_enabled: hasNotifications ? 
              (providerSettings as any).email_notifications_enabled ?? true : true,
            timezone: hasTimezone ? 
              (providerSettings as any).timezone ?? 'America/New_York' : 'America/New_York'
          })
        }
      }

      // If no fields in provider_profiles, try profiles table
      if (!availableFields.notifications && !availableFields.timezone) {
        const { data: profileSettings } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (profileSettings) {
          const hasNotifications = 'email_notifications_enabled' in (profileSettings as any)
          const hasTimezone = 'timezone' in (profileSettings as any)
          
          setAvailableFields({
            notifications: hasNotifications,
            timezone: hasTimezone
          })

          if (hasNotifications || hasTimezone) {
            setSettings({
              email_notifications_enabled: hasNotifications ? 
                (profileSettings as any).email_notifications_enabled ?? true : true,
              timezone: hasTimezone ? 
                (profileSettings as any).timezone ?? 'America/New_York' : 'America/New_York'
            })
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Try to save to provider_profiles first
      if (availableFields.notifications || availableFields.timezone) {
        const updateData: any = {}
        if (availableFields.notifications) {
          updateData.email_notifications_enabled = settings.email_notifications_enabled
        }
        if (availableFields.timezone) {
          updateData.timezone = settings.timezone
        }

        await (supabase as any)
          .from('provider_profiles')
          .update(updateData)
          .eq('provider_id', user.id)
      }

      alert('Settings updated')
      router.push('/provider/dashboard')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  const hasAnySettings = availableFields.notifications || availableFields.timezone

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/provider/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Dashboard
          </Link>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            {hasAnySettings ? (
              <form onSubmit={handleSave} className="space-y-6">
                {availableFields.notifications && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="email_notifications"
                      checked={settings.email_notifications_enabled}
                      onChange={(e) => setSettings({
                        ...settings, 
                        email_notifications_enabled: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="email_notifications">Enable email notifications</Label>
                  </div>
                )}

                {availableFields.timezone && (
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      value={settings.timezone}
                      onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No configurable settings available at this time.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => router.push('/provider/dashboard')}
                >
                  Back to Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}