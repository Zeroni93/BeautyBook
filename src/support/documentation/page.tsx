'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function DocumentationPage() {
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/sign-in')
      return
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/provider/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Dashboard
          </Link>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Documentation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Getting Started</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>
                    <Link href="/provider/onboarding" className="hover:text-gray-900">
                      Complete Provider Onboarding
                    </Link>
                  </li>
                  <li>
                    <Link href="/provider/account/profile" className="hover:text-gray-900">
                      Set Up Your Profile
                    </Link>
                  </li>
                  <li>
                    <Link href="/provider/services" className="hover:text-gray-900">
                      Manage Services
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Managing Your Business</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>
                    <Link href="/provider/availability" className="hover:text-gray-900">
                      Set Availability Hours
                    </Link>
                  </li>
                  <li>
                    <Link href="/provider/dashboard" className="hover:text-gray-900">
                      View Bookings & Analytics
                    </Link>
                  </li>
                  <li>
                    <Link href="/provider/payouts" className="hover:text-gray-900">
                      Manage Payments & Payouts
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Account Settings</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>
                    <Link href="/provider/account/settings" className="hover:text-gray-900">
                      Notification Preferences
                    </Link>
                  </li>
                  <li>
                    <Link href={"/support/contact" as any} className="hover:text-gray-900">
                      Contact Support
                    </Link>
                  </li>
                  <li>
                    <Link href={"/support/community" as any} className="hover:text-gray-900">
                      Join Community
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="pt-6 border-t">
                <p className="text-sm text-gray-500">
                  Need more help? Visit our{' '}
                  <Link href={"/support/contact" as any} className="text-blue-600 hover:text-blue-800">
                    support page
                  </Link>{' '}
                  or{' '}
                  <Link href={"/support/community" as any} className="text-blue-600 hover:text-blue-800">
                    community forums
                  </Link>
                  .
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}