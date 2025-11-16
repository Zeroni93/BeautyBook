'use server'

import { createClient } from '@/lib/auth/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

// Define the user settings type
export interface UserSettings {
  id: string
  user_id: string
  email_notifications: boolean
  dark_mode: boolean
  created_at: string
  updated_at: string
}

// Validation schema for updating settings
const updateSettingsSchema = z.object({
  email_notifications: z.boolean().optional(),
  dark_mode: z.boolean().optional(),
})

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>

/**
 * Get user settings for the current authenticated user
 * Creates a default row if none exists
 */
export async function getUserSettings(): Promise<UserSettings | null> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('User not authenticated')
    }

    // First, try to get existing settings using RLS
    const { data: existingSettings, error: selectError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned", which is expected if no settings exist yet
      console.error('Error selecting user settings:', selectError)
      throw selectError
    }

    if (existingSettings) {
      return existingSettings as UserSettings
    }

    // No settings exist, create default settings using the RPC function
    const { error: insertError } = await (supabase as any)
      .rpc('insert_user_settings', { user_uuid: user.id })

    if (insertError) {
      console.error('Error creating user settings:', insertError)
      throw insertError
    }

    // Now fetch the newly created settings
    const { data: newSettings, error: fetchError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      console.error('Error fetching new user settings:', fetchError)
      throw fetchError
    }

    return newSettings as UserSettings
  } catch (error) {
    console.error('Error getting user settings:', error)
    return null
  }
}

/**
 * Update user settings for the current authenticated user
 */
export async function updateUserSettings(
  input: UpdateSettingsInput
): Promise<{ success: boolean; error?: string; data?: UserSettings }> {
  try {
    // Validate input
    const validatedInput = updateSettingsSchema.parse(input)
    
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Update settings using the RPC function which handles upsert
    const { error: updateError } = await (supabase as any)
      .rpc('upsert_user_settings', {
        user_uuid: user.id,
        email_notifications: validatedInput.email_notifications ?? true,
        dark_mode: validatedInput.dark_mode ?? false
      })

    if (updateError) {
      console.error('Error updating user settings:', updateError)
      return { success: false, error: 'Failed to update settings' }
    }

    // Fetch the updated settings to return to the client
    const { data: updatedSettings, error: fetchError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      console.error('Error fetching updated settings:', fetchError)
      return { success: false, error: 'Failed to fetch updated settings' }
    }

    // Revalidate the settings page to ensure fresh data
    revalidatePath('/settings')

    return { 
      success: true, 
      data: updatedSettings as UserSettings 
    }
  } catch (error) {
    console.error('Error in updateUserSettings:', error)
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: 'Invalid input: ' + error.errors.map(e => e.message).join(', ') 
      }
    }
    return { success: false, error: 'An unexpected error occurred' }
  }
}