'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ClientProfile {
  user_id: string
  display_name: string
  avatar_url: string | null
  phone: string | null
  role: string
  created_at: string
}

export default function ClientProfilePage() {
  const params = useParams()
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    loadProfile()
    loadUserRole()
  }, [])

  const loadUserRole = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()
      
      setUserRole((userProfile as any)?.role || null)
    }
  }

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const clientId = params.id as string
      if (!clientId) {
        setError('Client ID not found')
        return
      }

      const supabase = createClient()

      // Load client profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          display_name,
          avatar_url,
          phone,
          role,
          created_at
        `)
        .eq('user_id', clientId)
        .eq('role', 'client')
        .single()

      if (profileError) {
        console.error('Error loading client profile:', profileError)
        setError('Client not found')
        return
      }

      setProfile(profileData as ClientProfile)

    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Failed to load client profile')
    } finally {
      setLoading(false)
    }
  }

  const getBackUrl = () => {
    if (userRole === 'provider') {
      return '/provider/dashboard'
    } else if (userRole === 'client') {
      return '/client/dashboard'
    }
    return '/' // Fallback to public homepage for unauthenticated users
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">😞</div>
            <CardTitle className="text-2xl">Profile Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              {error || 'The client profile you\'re looking for doesn\'t exist.'}
            </p>
            <div className="space-y-2">
              <Link href="/providers" className="block">
                <Button className="w-full">
                  Browse Providers
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link href={getBackUrl()} className="text-sm text-gray-600 hover:text-gray-900 mb-6 inline-block">
          ← Back to Home
        </Link>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="mb-6">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.display_name}
                      className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white text-3xl font-bold mx-auto border-4 border-white shadow-lg">
                      {profile.display_name.charAt(0)}
                    </div>
                  )}
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {profile.display_name}
                </h1>
                
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 mb-6">
                  Client
                </span>
                
                {profile.phone && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Contact</h3>
                    <p className="text-gray-600">{profile.phone}</p>
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Member Since</h3>
                  <p className="text-gray-600">
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                
                <div className="pt-6 border-t border-gray-200">
                  <div className="space-y-3">
                    <Link href="/providers" className="block">
                      <Button className="w-full">
                        Book a Service
                      </Button>
                    </Link>
                    <Button variant="outline" className="w-full">
                      Send Message
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}