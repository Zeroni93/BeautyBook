'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface ProfileData {
  business_name: string
  bio: string
  city: string
  state: string
  zip: string
  hero_image_url: string
  display_name: string
  avatar_url: string
  phone: string
}

export default function EditProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData>({
    business_name: '',
    bio: '',
    city: '',
    state: '',
    zip: '',
    hero_image_url: '',
    display_name: '',
    avatar_url: '',
    phone: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
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

      // Load profile and provider data
      const { data: profileInfo } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, phone')
        .eq('user_id', user.id)
        .single()

      const { data: providerInfo } = await supabase
        .from('provider_profiles')
        .select('business_name, bio, city, state, zip, hero_image_url')
        .eq('provider_id', user.id)
        .single()

      if (profileInfo && providerInfo) {
        setProfileData({
          display_name: (profileInfo as any).display_name || '',
          avatar_url: (profileInfo as any).avatar_url || '',
          phone: (profileInfo as any).phone || '',
          business_name: (providerInfo as any).business_name || '',
          bio: (providerInfo as any).bio || '',
          city: (providerInfo as any).city || '',
          state: (providerInfo as any).state || '',
          zip: (providerInfo as any).zip || '',
          hero_image_url: (providerInfo as any).hero_image_url || ''
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
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

      // Update profiles table
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({
          display_name: profileData.display_name,
          avatar_url: profileData.avatar_url || null,
          phone: profileData.phone || null
        })
        .eq('user_id', user.id)

      // Update provider_profiles table
      const { error: providerError } = await (supabase as any)
        .from('provider_profiles')
        .update({
          business_name: profileData.business_name,
          bio: profileData.bio || null,
          city: profileData.city,
          state: profileData.state,
          zip: profileData.zip,
          hero_image_url: profileData.hero_image_url || null
        })
        .eq('provider_id', user.id)

      if (profileError || providerError) {
        throw new Error('Failed to update profile')
      }

      // Show toast notification (simple alert for now)
      alert('Profile updated')
      router.push('/provider/dashboard')
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

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
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={profileData.display_name}
                    onChange={(e) => setProfileData({...profileData, display_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input
                    id="business_name"
                    value={profileData.business_name}
                    onChange={(e) => setProfileData({...profileData, business_name: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows={4}
                  value={profileData.bio}
                  onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profileData.city}
                    onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={profileData.state}
                    onChange={(e) => setProfileData({...profileData, state: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={profileData.zip}
                    onChange={(e) => setProfileData({...profileData, zip: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input
                  id="avatar_url"
                  type="url"
                  value={profileData.avatar_url}
                  onChange={(e) => setProfileData({...profileData, avatar_url: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="hero_image_url">Hero Image URL</Label>
                <Input
                  id="hero_image_url"
                  type="url"
                  value={profileData.hero_image_url}
                  onChange={(e) => setProfileData({...profileData, hero_image_url: e.target.value})}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}