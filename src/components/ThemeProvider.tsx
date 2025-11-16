'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // Load theme from user settings on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Try to get user settings
          const { data: settings } = await supabase
            .from('user_settings')
            .select('dark_mode')
            .eq('user_id', user.id)
            .single()
          
          if (settings) {
            const newTheme = (settings as any).dark_mode ? 'dark' : 'light'
            setThemeState(newTheme)
            applyTheme(newTheme)
          }
        } else {
          // No user, check localStorage or default to light
          const savedTheme = localStorage.getItem('theme') as Theme | null
          if (savedTheme) {
            setThemeState(savedTheme)
            applyTheme(savedTheme)
          }
        }
      } catch (error) {
        // If there's an error loading settings, check localStorage or default to light
        const savedTheme = localStorage.getItem('theme') as Theme | null
        if (savedTheme) {
          setThemeState(savedTheme)
          applyTheme(savedTheme)
        }
        console.log('Using default light theme')
      }
      
      setMounted(true)
    }

    loadTheme()
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(newTheme)
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    applyTheme(newTheme)
    
    // Save to localStorage for non-authenticated users
    localStorage.setItem('theme', newTheme)
    
    // Update the database in the background for authenticated users
    updateThemeInDatabase(newTheme)
  }

  const updateThemeInDatabase = async (newTheme: Theme) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // First get current settings to preserve email_notifications
        const { data: currentSettings } = await supabase
          .from('user_settings')
          .select('email_notifications')
          .eq('user_id', user.id)
          .single()
        
        const emailNotifications = (currentSettings as any)?.email_notifications ?? true
        
        await (supabase as any).rpc('upsert_user_settings', {
          user_uuid: user.id,
          email_notifications: emailNotifications,
          dark_mode: newTheme === 'dark'
        })
      }
    } catch (error) {
      console.error('Failed to update theme in database:', error)
    }
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <div className="bg-background text-foreground">{children}</div>
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}