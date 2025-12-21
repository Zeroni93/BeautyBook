'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatCurrency } from '@/lib/provider'

interface Payout {
  id: string
  stripe_transfer_id: string
  amount_cents: number
  currency: string
  status: string
  created_at: string
  booking_id: string
}

interface ProviderProfile {
  stripe_connect_id: string | null
  subscription_status: string
}

export default function ProviderPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [profile, setProfile] = useState<ProviderProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadPayoutsData()
  }, [])

  const loadPayoutsData = async () => {
    try {
      setLoading(true)

      const supabase = createClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        window.location.href = '/auth/sign-in'
        return
      }

      setUser(authUser)

      // Load provider profile
      const { data: profileData, error: profileError } = await supabase
        .from('provider_profiles')
        .select('stripe_connect_id, subscription_status')
        .eq('provider_id', authUser.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError
      }

      setProfile(profileData)

      // Load payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('payouts')
        .select('*')
        .eq('provider_id', authUser.id)
        .order('created_at', { ascending: false })

      if (payoutsError) {
        throw payoutsError
      }

      setPayouts(payoutsData || [])
    } catch (error) {
      console.error('Error loading payouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'text-green-600 bg-green-50'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div>Loading payouts...</div>
      </div>
    )
  }

  const hasStripeConnect = profile?.stripe_connect_id
  const hasActiveSubscription = profile?.subscription_status === 'active'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto flex items-center justify-between px-4 py-6">
          <div>
            <Link
              href="/provider/dashboard"
              className="text-sm text-blue-600 hover:underline"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              Payouts & Earnings
            </h1>
          </div>
          {hasStripeConnect && (
            <Button variant="outline">Stripe Dashboard</Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stripe Connect Status */}
        {!hasStripeConnect ? (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-orange-800">
                    Connect Your Stripe Account
                  </h3>
                  <p className="mt-1 text-orange-600">
                    You need to connect your Stripe account to receive payments
                  </p>
                </div>
                <Link href="/provider/onboarding">
                  <Button className="bg-orange-600 hover:bg-orange-700">
                    Connect Stripe
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : !hasActiveSubscription ? (
          <Card className="mb-8 border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-yellow-800">
                    Subscription Required
                  </h3>
                  <p className="mt-1 text-yellow-600">
                    You need an active subscription to receive payments
                  </p>
                </div>
                <Link href="/provider/onboarding">
                  <Button className="bg-yellow-600 hover:bg-yellow-700">
                    Activate Subscription
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-green-800">
                    Stripe Account Connected
                  </h3>
                  <p className="mt-1 text-green-600">
                    You&apos;re all set to receive payments
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">
                    Connected
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Earnings Summary */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(0)}
              </div>
              <p className="text-sm text-gray-500">0 transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Last 30 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(0)}
              </div>
              <p className="text-sm text-gray-500">0 transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                All Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  payouts.reduce((sum, payout) => sum + payout.amount_cents, 0)
                )}
              </div>
              <p className="text-sm text-gray-500">
                {payouts.length} transactions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payouts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <div className="py-8 text-center">
                <p className="mb-4 text-gray-500">No payouts yet</p>
                <p className="text-sm text-gray-400">
                  Complete bookings to start earning money
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Transfer ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Booking
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {new Date(payout.created_at).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-gray-600">
                          {payout.stripe_transfer_id}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {formatCurrency(payout.amount_cents)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(payout.status)}`}
                          >
                            {payout.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          <Button size="sm" variant="outline">
                            View Booking
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 font-medium">How Payouts Work</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>
                    • Payments are automatically transferred to your Stripe
                    account
                  </li>
                  <li>
                    • Stripe typically deposits funds within 2-7 business days
                  </li>
                  <li>• Platform fee (10%) is automatically deducted</li>
                  <li>• You&apos;ll receive detailed transaction records</li>
                </ul>
              </div>

              <div>
                <h4 className="mb-2 font-medium">Tax Information</h4>
                <p className="text-sm text-gray-600">
                  You&apos;re responsible for reporting earnings on your tax
                  return. You can download detailed reports from your Stripe
                  dashboard.
                </p>
              </div>

              <div>
                <h4 className="mb-2 font-medium">Need Help?</h4>
                <div className="flex space-x-3">
                  <Button variant="outline" size="sm">
                    Contact Support
                  </Button>
                  <Button variant="outline" size="sm">
                    View Documentation
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
