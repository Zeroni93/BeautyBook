'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CommunityPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/sign-in')
      return
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    setUserRole((profile as any)?.role || null)
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-6">
          <Link
            href={getBackUrl()}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Community</CardTitle>
          </CardHeader>
          <CardContent className="py-12 text-center">
            <div className="space-y-6">
              <div className="text-6xl">👥</div>
              <div>
                <h2 className="mb-2 text-2xl font-semibold text-gray-900">
                  Community Features Coming Soon
                </h2>
                <p className="mx-auto max-w-md text-gray-600">
                  We&apos;re building an amazing community platform where beauty
                  providers can connect, share tips, and grow their businesses
                  together.
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  In the meantime, feel free to reach out for support:
                </p>
                <div className="flex justify-center gap-4">
                  <Button asChild variant="outline">
                    <Link href={'/support/contact' as any}>
                      Contact Support
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={'/support/documentation' as any}>
                      View Documentation
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="border-t pt-6">
                <Button asChild>
                  <Link href={getBackUrl()}>Back to Dashboard</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
