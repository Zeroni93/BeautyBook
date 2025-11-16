import { createClient } from '@/lib/auth/client'

export interface UploadAvatarResult {
  success: boolean
  avatarUrl?: string
  error?: string
}

export const uploadAvatar = async (file: File, userId: string): Promise<UploadAvatarResult> => {
  try {
    const supabase = createClient()

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Please upload an image file.' }
    }

    // Validate file size (10MB max)
    const maxSizeBytes = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSizeBytes) {
      return { success: false, error: 'File size must be less than 10MB.' }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `${timestamp}.${fileExt}`
    const filePath = `avatars/${userId}/${fileName}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { success: false, error: 'Failed to upload image. Please try again.' }
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(uploadData.path)

    const avatarUrl = urlData.publicUrl

    // Update profile with new avatar URL
    const { error: updateError } = await (supabase as any)
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Profile update error:', updateError)
      
      // Clean up uploaded file if profile update fails
      await supabase.storage.from('avatars').remove([uploadData.path])
      
      return { success: false, error: 'Failed to update profile. Please try again.' }
    }

    return { success: true, avatarUrl }
  } catch (error) {
    console.error('Avatar upload error:', error)
    return { success: false, error: 'An unexpected error occurred. Please try again.' }
  }
}