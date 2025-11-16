'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { UserAvatar } from '@/components/UserAvatar'
import { createClient } from '@/lib/auth/client'
import { uploadAvatar } from '@/lib/supabase/uploadAvatar'
import { getUserSettings, updateUserSettings, type UserSettings } from './actions'

interface UserProfile {
  display_name: string
  avatar_url: string | null
  phone: string | null
}

// Hook to handle theme without requiring ThemeProvider
function useThemeHook() {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Get initial theme from HTML class
    const isDark = document.documentElement.classList.contains('dark')
    setThemeState(isDark ? 'dark' : 'light')
  }, [])

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme)
    // Apply to document immediately
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(newTheme)
  }

  return { theme, setTheme }
}

export default function SettingsPage() {
  const { theme, setTheme } = useThemeHook()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load user settings
      const userSettings = await getUserSettings()
      if (userSettings) {
        setSettings(userSettings)
        setEmailNotifications(userSettings.email_notifications)
        setDarkMode(userSettings.dark_mode)
        // Sync the theme with the loaded settings
        setTheme(userSettings.dark_mode ? 'dark' : 'light')
      }

      // Load profile data
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setCurrentUserId(user.id)
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, phone')
          .eq('user_id', user.id)
          .single()
        
        if (profileData) {
          const profile = profileData as UserProfile
          setProfile(profile)
          setDisplayName(profile.display_name || '')
          setPhone(profile.phone || '')
        }
      }
    } catch (err) {
      setError('Failed to load data')
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDarkModeToggle = (newDarkMode: boolean) => {
    setDarkMode(newDarkMode)
    // Immediately apply the theme change
    setTheme(newDarkMode ? 'dark' : 'light')
  }

  const handleChangePhotoClick = () => {
    setUploadError(null)
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !currentUserId) return

    setUploadingAvatar(true)
    setUploadError(null)

    const result = await uploadAvatar(file, currentUserId)

    if (result.success && result.avatarUrl) {
      // Update local profile state with new avatar URL
      setProfile(prev => prev ? { ...prev, avatar_url: result.avatarUrl! } : null)
    } else {
      setUploadError(result.error || 'Failed to upload image')
    }

    setUploadingAvatar(false)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)

      // Update user settings
      const settingsResult = await updateUserSettings({
        email_notifications: emailNotifications,
        dark_mode: darkMode,
      })

      if (!settingsResult.success) {
        setError(settingsResult.error || 'Failed to save settings')
        return
      }

      // Update profile data if it has changed
      if (currentUserId && (
        displayName !== (profile?.display_name || '') ||
        phone !== (profile?.phone || '')
      )) {
        const supabase = createClient()
        const { error: profileError } = await (supabase as any)
          .from('profiles')
          .update({
            display_name: displayName,
            phone: phone || null
          })
          .eq('user_id', currentUserId)

        if (profileError) {
          setError('Failed to update profile')
          console.error('Profile update error:', profileError)
          return
        }

        // Update local profile state
        setProfile(prev => prev ? {
          ...prev,
          display_name: displayName,
          phone: phone || null
        } : null)
      }

      if (settingsResult.data) {
        setSettings(settingsResult.data)
      }
      
      setSuccessMessage('Settings saved successfully!')
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError('An unexpected error occurred')
      console.error('Error saving settings:', err)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = (settings && (
    settings.email_notifications !== emailNotifications ||
    settings.dark_mode !== darkMode
  )) || (profile && (
    profile.display_name !== displayName ||
    (profile.phone || '') !== phone
  ))

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            ← Back
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account preferences and notification settings.
          </p>
        </div>

        <Card className="p-6">
          {error && (
            <div
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          {successMessage && (
            <div
              className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg"
              role="alert"
              aria-live="polite"
            >
              {successMessage}
            </div>
          )}

          {/* Profile Section */}
          <div className="space-y-6 mb-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Profile
              </h2>
              
              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
                  <UserAvatar
                    avatarUrl={profile?.avatar_url}
                    displayName={displayName || 'User'}
                    size="md"
                  />
                  
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleChangePhotoClick}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                    </Button>
                    
                    {uploadError && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {uploadError}
                      </p>
                    )}
                    
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="display-name" className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Display Name
                    </Label>
                    <Input
                      id="display-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone" className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Phone Number (Optional)
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 mb-8"></div>

          {/* Preferences Section */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Preferences
              </h2>
            </div>

            {/* Email Notifications Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label 
                  htmlFor="email-notifications"
                  className="text-base font-medium text-gray-900 dark:text-gray-100"
                >
                  Email Notifications
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Receive email notifications about bookings, updates, and important announcements.
                </p>
              </div>
              <div className="ml-4">
                <button
                  id="email-notifications"
                  type="button"
                  role="switch"
                  aria-checked={emailNotifications}
                  aria-labelledby="email-notifications-label"
                  className={`
                    relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                    transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${emailNotifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                  `}
                  onClick={() => setEmailNotifications(!emailNotifications)}
                >
                  <span className="sr-only">Enable email notifications</span>
                  <span
                    aria-hidden="true"
                    className={`
                      pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 
                      transition duration-200 ease-in-out
                      ${emailNotifications ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  />
                </button>
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label 
                  htmlFor="dark-mode"
                  className="text-base font-medium text-gray-900 dark:text-gray-100"
                >
                  Dark Mode
                </Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Switch between light and dark themes for a comfortable viewing experience.
                </p>
              </div>
              <div className="ml-4">
                <button
                  id="dark-mode"
                  type="button"
                  role="switch"
                  aria-checked={darkMode}
                  aria-labelledby="dark-mode-label"
                  className={`
                    relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                    transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${darkMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                  `}
                  onClick={() => handleDarkModeToggle(!darkMode)}
                >
                  <span className="sr-only">Enable dark mode</span>
                  <span
                    aria-hidden="true"
                    className={`
                      pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 
                      transition duration-200 ease-in-out
                      ${darkMode ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="min-w-[120px]"
              >
                {saving ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
            {hasChanges && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-right">
                You have unsaved changes
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}