'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface MediaAsset {
  id: string
  type: 'image' | 'video'
  storage_path: string
  width?: number
  height?: number
  duration_seconds?: number
  size_bytes: number
  is_public: boolean
  created_at: string
}

export default function ProviderGalleryPage() {
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadGallery()
  }, [])

  const loadGallery = async () => {
    try {
      setLoading(true)
      
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        window.location.href = '/auth/sign-in'
        return
      }

      setUser(authUser)

      const { data: gallery, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('provider_id', authUser.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setMediaAssets(gallery || [])

    } catch (error) {
      console.error('Error loading gallery:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="dark:text-slate-200">Loading gallery...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800 shadow">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <Link href="/provider/dashboard" className="text-sm text-blue-600 hover:underline">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">
              Gallery Management
            </h1>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">Upload Images</Button>
            <Button>Upload Videos</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {mediaAssets.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2 dark:text-slate-100">No Media Uploaded</h3>
                <p className="text-gray-600 dark:text-slate-400 mb-4">
                  Showcase your work with photos and videos to attract more clients
                </p>
                <div className="flex justify-center space-x-3">
                  <Button variant="outline">Upload Images</Button>
                  <Button>Upload Videos</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Upload Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="dark:text-slate-100">Upload New Media</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-8 text-center">
                  <div className="space-y-4">
                    <div>
                      <span className="text-4xl">📷</span>
                      <p className="text-gray-600 dark:text-slate-400 mt-2">
                        Drag & drop files here, or click to select
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Supports: JPG, PNG, MP4, MOV (Max 10MB for images, 200MB for videos)
                      </p>
                    </div>
                    <div className="flex justify-center space-x-3">
                      <Button disabled>Select Images</Button>
                      <Button disabled>Select Videos</Button>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      Upload functionality coming soon
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Media Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {mediaAssets.map((asset) => (
                <Card key={asset.id}>
                  <CardContent className="p-0">
                    <div className="aspect-square bg-gray-200 dark:bg-slate-700 relative overflow-hidden rounded-t">
                      {asset.type === 'image' ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl">🖼️</span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <span className="text-4xl block">🎥</span>
                            {asset.duration_seconds && (
                              <span className="text-xs text-gray-500 dark:text-slate-400">
                                {Math.floor(asset.duration_seconds / 60)}:
                                {String(asset.duration_seconds % 60).padStart(2, '0')}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Status indicators */}
                      <div className="absolute top-2 right-2 flex space-x-1">
                        <span className={`px-2 py-1 text-xs rounded ${
                          asset.is_public ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {asset.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-slate-400">Type:</span>
                          <span className="font-medium dark:text-slate-200 capitalize">{asset.type}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-slate-400">Size:</span>
                          <span className="font-medium dark:text-slate-200">{formatFileSize(asset.size_bytes)}</span>
                        </div>
                        {asset.width && asset.height && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-slate-400">Dimensions:</span>
                            <span className="font-medium dark:text-slate-200">{asset.width}×{asset.height}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-slate-400">Uploaded:</span>
                          <span className="font-medium dark:text-slate-200">
                            {new Date(asset.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 mt-4">
                        <Button size="sm" variant="outline" className="flex-1">
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive">
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Usage Guidelines */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Media Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Images</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Maximum file size: 10MB</li>
                  <li>• Supported formats: JPG, PNG</li>
                  <li>• Recommended size: 1080×1080px</li>
                  <li>• Show your best work clearly</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Videos</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Maximum file size: 200MB</li>
                  <li>• Supported formats: MP4, MOV</li>
                  <li>• Maximum duration: 60 seconds</li>
                  <li>• Landscape or square format preferred</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}