'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  role: z.enum(['client', 'provider'], {
    required_error: 'Please select a role',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignUpForm = z.infer<typeof signUpSchema>

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const form = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      role: 'client',
    },
  })

  const onSubmit = async (data: SignUpForm) => {
    setIsLoading(true)
    setError('')

    try {
      const supabase = createClient()
      
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            display_name: data.displayName,
            role: data.role,
          } as any)

        if (profileError) {
          console.error('Profile creation error:', profileError)
          setError('Failed to create profile. Please try again.')
          return
        }

        // If provider, also create provider_profile
        if (data.role === 'provider') {
          const { error: providerError } = await supabase
            .from('provider_profiles')
            .insert({
              provider_id: authData.user.id,
              business_name: data.displayName,
              bio: '',
              address_line1: '',
              city: '',
              state: '',
              zip: '',
            } as any)

          if (providerError) {
            console.error('Provider profile creation error:', providerError)
            // Continue anyway - they can complete onboarding later
          }
        }

        // Redirect based on role
        if (data.role === 'provider') {
          router.push('/provider/onboarding' as any)
        } else {
          router.push('/client/dashboard' as any)
        }
      }
    } catch (err) {
      console.error('Sign up error:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl dark:text-slate-100">Create Account</CardTitle>
          <CardDescription className="dark:text-slate-400">Join Beauty Book to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 px-3 py-2 rounded text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="role">I am a</Label>
              <select
                id="role"
                className="flex h-10 w-full rounded-md border border-input bg-background dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 px-3 py-2 text-sm ring-offset-background focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                {...form.register('role')}
              >
                <option value="client">Client (Book services)</option>
                <option value="provider">Provider (Offer services)</option>
              </select>
              {form.formState.errors.role && (
                <p className="text-red-600 dark:text-red-400 text-sm">{form.formState.errors.role.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Full Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Enter your full name"
                {...form.register('displayName')}
              />
              {form.formState.errors.displayName && (
                <p className="text-red-600 dark:text-red-400 text-sm">{form.formState.errors.displayName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-red-600 dark:text-red-400 text-sm">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-red-600 dark:text-red-400 text-sm">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                {...form.register('confirmPassword')}
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-red-600 dark:text-red-400 text-sm">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Already have an account?{' '}
              <Link href="/auth/sign-in" prefetch={false} className="text-blue-600 dark:text-blue-400 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}