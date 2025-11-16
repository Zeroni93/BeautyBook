'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Sign-in page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-red-600">Something went wrong</CardTitle>
          <CardDescription>An error occurred while loading the sign-in page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded text-sm">
            {error.message || 'An unexpected error occurred'}
          </div>
          <div className="flex gap-2">
            <Button onClick={reset} variant="outline" className="flex-1">
              Try again
            </Button>
            <Button 
              onClick={() => window.location.href = '/'}
              className="flex-1"
            >
              Go home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}