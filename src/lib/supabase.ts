import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validation with clear error messages
if (!supabaseUrl) {
  console.error('[Supabase] NEXT_PUBLIC_SUPABASE_URL is missing')
  throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required')
}

if (!supabaseAnonKey) {
  console.error('[Supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY is missing')
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required')
}

// Dev-only environment check
if (process.env.NODE_ENV === 'development') {
  console.log('[Supabase] Environment variables check:', {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? 'present' : 'missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? 'present' : 'missing',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing'
  })
}

/**
 * Browser client - always uses anon key
 * Safe for client-side usage with RLS policies
 */
export const createBrowserSupabase = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}

/**
 * Server client - uses anon key by default 
 * Suitable for user-scoped operations with RLS
 */
export const createServerSupabase = () => {
  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Service client - requires service role key
 * ONLY for admin/webhook operations that bypass RLS
 * Throws clear error if SUPABASE_SERVICE_ROLE_KEY is missing
 */
export const createServiceSupabase = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error(
      'Set SUPABASE_SERVICE_ROLE_KEY in .env.local (Server only). ' +
      'See docs/env-setup.md for setup instructions. ' + 
      'This key is required for admin operations and webhooks only.'
    )
  }
  
  return createClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// Legacy exports for backward compatibility
export const supabase = createBrowserSupabase()
export const createBrowserClient = createBrowserSupabase
export const createServerClient = createServerSupabase