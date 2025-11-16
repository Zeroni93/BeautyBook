'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProviderError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to an error reporting service
    console.error('Provider error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <CardTitle className="text-2xl text-red-600">
            Something went wrong!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            An error occurred in the provider section. Our team has been notified.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="text-left bg-gray-100 p-3 rounded text-sm">
              <p className="font-bold">Error details:</p>
              <p className="text-red-600">{error.message}</p>
            </div>
          )}
          <div className="space-y-2">
            <Button onClick={reset} className="w-full">
              Try Again
            </Button>
            <Link href="/provider/dashboard" className="block">
              <Button variant="outline" className="w-full">
                Go to Provider Dashboard
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