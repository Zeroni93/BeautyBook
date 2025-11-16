'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface EnvStatus {
  key: string
  status: 'present' | 'missing'
  description: string
}

export default function DevEnvironmentInspector() {
  const [envStatus, setEnvStatus] = useState<EnvStatus[]>([])

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    const checkEnvVars = [
      {
        key: 'NEXT_PUBLIC_SUPABASE_URL',
        value: process.env.NEXT_PUBLIC_SUPABASE_URL,
        description: 'Supabase project URL for client-side access'
      },
      {
        key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        description: 'Supabase anonymous key for client-side access'
      },
      {
        key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
        value: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        description: 'Stripe publishable key for client-side payments'
      },
      {
        key: 'NEXT_PUBLIC_SITE_URL',
        value: process.env.NEXT_PUBLIC_SITE_URL,
        description: 'Base URL for the application'
      }
    ]

    const status: EnvStatus[] = checkEnvVars.map(({ key, value, description }) => ({
      key,
      status: (value ? 'present' : 'missing') as 'present' | 'missing',
      description
    }))

    setEnvStatus(status)
    
    // Log to console for debugging
    console.log('[Environment Inspector] Client-side environment variables:', 
      Object.fromEntries(status.map(s => [s.key, s.status]))
    )
  }, [])

  // Don't render in production
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Environment Inspector</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              This page is only available in development mode.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Development Environment Inspector
          </h1>
          <p className="text-gray-600">
            Check the status of required environment variables for client-side access.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Client-Side Environment Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {envStatus.map(({ key, status, description }) => (
                <div
                  key={key}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    status === 'present'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{key}</div>
                    <div className="text-sm text-gray-600">{description}</div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      status === 'present'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {status}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">
                  If any variables are missing:
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Check that <code className="bg-gray-100 px-1 rounded">.env.local</code> exists in the project root</li>
                  <li>Verify all required variables are set in <code className="bg-gray-100 px-1 rounded">.env.local</code></li>
                  <li>Restart the development server: <code className="bg-gray-100 px-1 rounded">npm run dev</code></li>
                  <li>Refresh this page to check again</li>
                </ol>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">
                  Common Issues:
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>File named <code className="bg-gray-100 px-1 rounded">.env.local.txt</code> instead of <code className="bg-gray-100 px-1 rounded">.env.local</code></li>
                  <li>Variables wrapped in quotes (remove quotes)</li>
                  <li>Extra spaces before or after variable names/values</li>
                  <li>File not in the project root directory</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}