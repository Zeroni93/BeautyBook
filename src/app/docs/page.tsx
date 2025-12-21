'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/auth/client'

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: '🚀' },
    { id: 'provider-onboarding', title: 'Provider Onboarding', icon: '👨‍💼' },
    {
      id: 'services-availability',
      title: 'Services & Availability',
      icon: '📅',
    },
    { id: 'bookings-payments', title: 'Bookings & Payments', icon: '💳' },
    { id: 'reviews-policies', title: 'Reviews & Policies', icon: '⭐' },
  ]

  useEffect(() => {
    loadUserRole()
  }, [])

  const loadUserRole = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      setUserRole((profile as any)?.role || null)
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

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setSidebarOpen(false) // Close sidebar on mobile after navigation
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav
          className={`fixed inset-y-0 left-0 z-30 w-64 transform border-r border-gray-200 bg-white transition-transform lg:static lg:inset-0 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} `}
        >
          <div className="p-6">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Documentation</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-2 text-gray-400 hover:text-gray-600 lg:hidden"
                aria-label="Close sidebar"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <ul className="space-y-2">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => scrollToSection(section.id)}
                    className={`flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-left transition-colors ${
                      activeSection === section.id
                        ? 'border-l-2 border-blue-500 bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } `}
                  >
                    <span className="text-lg">{section.icon}</span>
                    <span className="font-medium">{section.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          {/* Back Button - Desktop */}
          <div className="hidden p-6 lg:block lg:p-8">
            <div className="mb-6">
              <Link
                href={getBackUrl()}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="border-b border-gray-200 bg-white p-4 lg:hidden">
            <div className="flex items-center justify-between">
              <Link
                href={getBackUrl()}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-lg font-semibold text-gray-900">
                Documentation
              </h1>
              <Button
                onClick={() => setSidebarOpen(true)}
                variant="outline"
                size="sm"
                aria-label="Open sidebar"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </Button>
            </div>
          </div>

          <div className="max-w-4xl p-6 lg:p-8 lg:pt-0">
            {/* Getting Started */}
            <section id="getting-started" className="mb-12">
              <Card className="p-6">
                <h1 className="mb-4 flex items-center text-3xl font-bold text-gray-900">
                  <span className="mr-3 text-3xl">🚀</span>
                  Getting Started
                </h1>
                <div className="prose prose-gray max-w-none">
                  <p className="mb-6 text-lg text-gray-600">
                    Welcome to BeautyBook! This comprehensive guide will help
                    you get started with our platform, whether you&apos;re a
                    beauty service provider or a client looking to book
                    services.
                  </p>

                  <h3 className="mb-3 text-xl font-semibold text-gray-900">
                    For Clients
                  </h3>
                  <ul className="mb-6 list-inside list-disc space-y-2 text-gray-700">
                    <li>
                      Create your account and complete your profile with your
                      preferences
                    </li>
                    <li>Browse local beauty service providers in your area</li>
                    <li>
                      View detailed service offerings, pricing, and availability
                    </li>
                    <li>Book appointments with secure payment processing</li>
                    <li>
                      Manage your bookings and leave reviews after services
                    </li>
                  </ul>

                  <h3 className="mb-3 text-xl font-semibold text-gray-900">
                    For Providers
                  </h3>
                  <ul className="list-inside list-disc space-y-2 text-gray-700">
                    <li>
                      Complete the provider onboarding process and business
                      verification
                    </li>
                    <li>
                      Set up your service catalog with descriptions and pricing
                    </li>
                    <li>Configure your availability and booking rules</li>
                    <li>
                      Connect your Stripe account for secure payment processing
                    </li>
                    <li>Manage bookings and build your client base</li>
                  </ul>
                </div>
              </Card>
            </section>

            {/* Provider Onboarding */}
            <section id="provider-onboarding" className="mb-12">
              <Card className="p-6">
                <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                  <span className="mr-3 text-2xl">👨‍💼</span>
                  Provider Onboarding
                </h2>
                <div className="prose prose-gray max-w-none">
                  <p className="mb-4 text-gray-600">
                    Our comprehensive onboarding process ensures that
                    you&apos;re fully set up to start receiving bookings.
                  </p>

                  <h3 className="mb-3 text-xl font-semibold text-gray-900">
                    Step 1: Business Information
                  </h3>
                  <p className="mb-4 text-gray-700">
                    Provide your business name, address, and contact
                    information. This helps with your professional profile and
                    service location details.
                  </p>

                  <h3 className="mb-3 text-xl font-semibold text-gray-900">
                    Step 2: Payment Setup
                  </h3>
                  <p className="mb-4 text-gray-700">
                    Connect your Stripe account to receive payments directly. We
                    handle the platform fee (10%) automatically, and you receive
                    the rest directly in your bank account.
                  </p>

                  <h3 className="mb-3 text-xl font-semibold text-gray-900">
                    Step 3: Subscription
                  </h3>
                  <p className="mb-4 text-gray-700">
                    Subscribe to our monthly provider plan ($5/month) to access
                    all platform features including booking management, customer
                    communication, and analytics.
                  </p>

                  <h3 className="mb-3 text-xl font-semibold text-gray-900">
                    Step 4: Verification
                  </h3>
                  <p className="text-gray-700">
                    Our team reviews your application to ensure quality and
                    authenticity. Once approved, your profile becomes visible to
                    clients.
                  </p>
                </div>
              </Card>
            </section>

            {/* Services & Availability */}
            <section id="services-availability" className="mb-12">
              <Card className="p-6">
                <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                  <span className="mr-3 text-2xl">📅</span>
                  Services & Availability
                </h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="mb-3 text-xl font-semibold text-gray-900">
                    Service Management
                  </h3>
                  <p className="mb-4 text-gray-700">
                    Create detailed service listings with accurate descriptions,
                    duration, and pricing. High-quality service descriptions
                    help clients understand what to expect.
                  </p>

                  <h3 className="mb-3 text-xl font-semibold text-gray-900">
                    Availability Rules
                  </h3>
                  <p className="mb-4 text-gray-700">
                    Set your regular weekly availability and any special
                    exceptions. Configure:
                  </p>
                  <ul className="mb-4 list-inside list-disc space-y-1 text-gray-700">
                    <li>Working hours for each day of the week</li>
                    <li>Break times and buffer periods between appointments</li>
                    <li>Lead time requirements for bookings</li>
                    <li>
                      Maximum booking window (how far in advance clients can
                      book)
                    </li>
                  </ul>

                  <h3 className="mb-3 text-xl font-semibold text-gray-900">
                    Special Dates & Holidays
                  </h3>
                  <p className="text-gray-700">
                    Mark specific dates as unavailable or set special hours for
                    holidays and events. Your availability calendar
                    automatically updates to reflect these changes.
                  </p>
                </div>
              </Card>
            </section>

            {/* Bookings & Payments */}
            <section id="bookings-payments" className="mb-12">
              <Card className="p-6">
                <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                  <span className="mr-3 text-2xl">💳</span>
                  Bookings & Payments
                </h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="mb-3 text-xl font-semibold text-gray-900">
                    Booking Process
                  </h3>
                  <p className="mb-4 text-gray-700">
                    Clients can book your services directly through the
                    platform. You&apos;ll receive immediate notifications and
                    can manage all bookings from your dashboard.
                  </p>

                  <h3 className="mb-3 text-xl font-semibold text-gray-900">
                    Payment Processing
                  </h3>
                  <p className="mb-4 text-gray-700">
                    All payments are processed securely through Stripe.
                    Here&apos;s how it works:
                  </p>
                  <ul className="mb-4 list-inside list-disc space-y-1 text-gray-700">
                    <li>
                      Clients pay upfront when booking (credit card or digital
                      wallet)
                    </li>
                    <li>Platform fee (10%) is automatically deducted</li>
                    <li>
                      Your earnings are transferred to your bank account within
                      2-3 business days
                    </li>
                    <li>
                      All transactions include detailed receipts and tax
                      documentation
                    </li>
                  </ul>

                  <h3 className="mb-3 text-xl font-semibold text-gray-900">
                    Cancellation Policy
                  </h3>
                  <p className="text-gray-700">
                    Set your cancellation policy and fees. The platform enforces
                    these automatically, protecting both you and your clients
                    with clear expectations.
                  </p>
                </div>
              </Card>
            </section>

            {/* Reviews & Policies */}
            <section id="reviews-policies" className="mb-12">
              <Card className="p-6">
                <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                  <span className="mr-3 text-2xl">⭐</span>
                  Reviews & Policies
                </h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="mb-3 text-xl font-semibold text-gray-900">
                    Review System
                  </h3>
                  <p className="mb-4 text-gray-700">
                    After each completed service, clients can leave reviews and
                    ratings. This helps build trust and credibility in our
                    marketplace.
                  </p>

                  <h3 className="mb-3 text-xl font-semibold text-gray-900">
                    Platform Policies
                  </h3>
                  <ul className="mb-4 list-inside list-disc space-y-1 text-gray-700">
                    <li>
                      <strong>Quality Standards:</strong> All providers must
                      maintain professional service quality
                    </li>
                    <li>
                      <strong>Communication:</strong> Respond to client
                      inquiries within 24 hours
                    </li>
                    <li>
                      <strong>No-Show Policy:</strong> Configure fees for
                      clients who miss appointments
                    </li>
                    <li>
                      <strong>Safety First:</strong> Follow all health and
                      safety regulations in your area
                    </li>
                  </ul>

                  <h3 className="mb-3 text-xl font-semibold text-gray-900">
                    Dispute Resolution
                  </h3>
                  <p className="mb-4 text-gray-700">
                    If issues arise with bookings or payments, our support team
                    is available to help resolve disputes fairly and quickly.
                  </p>

                  <h3 className="mb-3 text-xl font-semibold text-gray-900">
                    Need Help?
                  </h3>
                  <p className="text-gray-700">
                    Contact our support team through the platform or email
                    support@beautybook.com. We&apos;re here to help you succeed
                    on BeautyBook!
                  </p>
                </div>
              </Card>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
