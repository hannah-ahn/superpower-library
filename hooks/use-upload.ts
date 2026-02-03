'use client'

import { useState, useCallback } from 'react'
import type { UploadProgress } from '@/types/database'

interface UseUploadReturn {
  uploads: UploadProgress[]
  uploading: boolean
  uploadFiles: (files: File[], onComplete?: () => void) => Promise<void>
  clearCompleted: () => void
}

export function useUpload(): UseUploadReturn {
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [uploading, setUploading] = useState(false)

  const uploadFiles = useCallback(
    async (files: File[], onComplete?: () => void) => {
      setUploading(true)

      // Initialize upload progress
      const initialUploads: UploadProgress[] = files.map((file) => ({
        filename: file.name,
        progress: 0,
        status: 'uploading',
      }))
      setUploads((prev) => [...initialUploads, ...prev])

      const maxConcurrent = 5

      // Process in batches
      for (let i = 0; i < files.length; i += maxConcurrent) {
        const batch = files.slice(i, i + maxConcurrent)

        const uploadPromises = batch.map(async (file, batchIndex) => {
          const index = i + batchIndex
          const filename = file.name

          try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/assets', {
              method: 'POST',
              body: formData,
            })

            if (!response.ok) {
              const error = await response.json()
              throw new Error(error.error || 'Upload failed')
            }

            // Update to processing
            setUploads((prev) =>
              prev.map((u) =>
                u.filename === filename
                  ? { ...u, status: 'processing', progress: 100 }
                  : u
              )
            )

            // Mark as complete after a short delay
            setTimeout(() => {
              setUploads((prev) =>
                prev.map((u) =>
                  u.filename === filename ? { ...u, status: 'complete' } : u
                )
              )
            }, 1000)
          } catch (err) {
            setUploads((prev) =>
              prev.map((u) =>
                u.filename === filename
                  ? {
                      ...u,
                      status: 'error',
                      error: err instanceof Error ? err.message : 'Upload failed',
                    }
                  : u
              )
            )
          }
        })

        await Promise.allSettled(uploadPromises)
      }

      setUploading(false)
      onComplete?.()
    },
    []
  )

  const clearCompleted = useCallback(() => {
    setUploads((prev) =>
      prev.filter((u) => u.status !== 'complete' && u.status !== 'error')
    )
  }, [])

  return {
    uploads,
    uploading,
    uploadFiles,
    clearCompleted,
  }
}
