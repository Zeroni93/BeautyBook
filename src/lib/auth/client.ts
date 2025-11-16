import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types'

// Dev-only sanity check
if (process.env.NODE_ENV === 'development') {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('[Supabase Client] Environment variables check:', {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? 'present' : 'missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? 'present' : 'missing'
  })
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase Client] Missing required environment variables')
  }
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}