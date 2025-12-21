'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// Force dynamic rendering for auth page
export const dynamic = 'force-dynamic'

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

interface UserProfile {
  role: 'client' | 'provider'
}

type SignInForm = z.infer<typeof signInSchema>

function SignInForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const form = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: SignInForm) => {
    setIsLoading(true)
    setError('')

    try {
      const supabase = createClient()

      // Sign in the user
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })

      if (authError) {
        setError(authError.message)
        return
      }

      if (authData.user) {
        // Get user profile to determine role
        const { data: profile, error: profileError } = (await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', authData.user.id)
          .single()) as { data: UserProfile | null; error: any }

        if (profileError) {
          console.error('Profile fetch error:', profileError)
          // If no profile exists, redirect to sign up
          window.location.href = '/auth/sign-up'
          return
        }

        // Check for redirect parameter
        const redirectUrl = searchParams.get('redirect') || '/'

        // Provider-specific landing logic with onboarding check
        if (profile?.role === 'provider') {
          if (redirectUrl !== '/') {
            window.location.href = redirectUrl
            return
          }

          // Use the onboarding actions to check status
          try {
            const response = await fetch('/api/onboarding/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ providerId: authData.user.id }),
            })

            if (response.ok) {
              const { isComplete, nextStep } = await response.json()

              if (isComplete) {
                window.location.href = '/provider/dashboard'
              } else {
                const onboardingPath = nextStep
                  ? `/provider/onboarding?step=${nextStep}`
                  : '/provider/onboarding'
                window.location.href = onboardingPath
              }
            } else {
              // Fallback to basic onboarding check
              window.location.href = '/provider/onboarding'
            }
          } catch (err) {
            console.error('Error checking onboarding status:', err)
            window.location.href = '/provider/onboarding'
          }
        } else {
          // Client or other roles
          if (redirectUrl !== '/') {
            window.location.href = redirectUrl
          } else {
            window.location.href = '/client/dashboard'
          }
        }
      }
    } catch (err) {
      console.error('Sign in error:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl dark:text-slate-100">
            Welcome Back
          </CardTitle>
          <CardDescription className="dark:text-slate-400">
            Sign in to your Beauty Book account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Don&apos;t have an account?{' '}
              <Link
                href="/auth/sign-up"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Create one
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignInPage() {
  return <SignInForm />
}
