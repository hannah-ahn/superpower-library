'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AssetWithDetails } from '@/types/database'

interface UseAssetsReturn {
  assets: AssetWithDetails[]
  loading: boolean
  error: string | null
  uploadFiles: (files: File[]) => Promise<void>
  deleteAsset: (id: string) => Promise<void>
  updateAsset: (id: string, updates: Partial<AssetWithDetails>) => Promise<void>
  retryProcessing: (id: string) => Promise<void>
  downloadAsset: (id: string) => Promise<string | null>
  refresh: () => Promise<void>
}

export function useAssets(): UseAssetsReturn {
  const [assets, setAssets] = useState<AssetWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/assets')
      if (!response.ok) throw new Error('Failed to fetch assets')

      const data = await response.json()
      setAssets(data.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const uploadFiles = useCallback(async (files: File[]) => {
    const maxConcurrent = 5
    const results: AssetWithDetails[] = []

    // Process in batches
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent)

      const uploads = batch.map(async (file) => {
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

        const data = await response.json()
        return data.asset as AssetWithDetails
      })

      const batchResults = await Promise.allSettled(uploads)
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        }
      }
    }

    // Add new assets to the beginning
    setAssets((prev) => [...results, ...prev])
  }, [])

  const deleteAsset = useCallback(async (id: string) => {
    const response = await fetch(`/api/assets/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to delete asset')
    }

    setAssets((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const updateAsset = useCallback(async (id: string, updates: Partial<AssetWithDetails>) => {
    const response = await fetch(`/api/assets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error('Failed to update asset')
    }

    const updatedAsset = await response.json()

    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updatedAsset } : a))
    )
  }, [])

  const retryProcessing = useCallback(async (id: string) => {
    const response = await fetch(`/api/assets/${id}/retry-processing`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('Failed to retry processing')
    }

    setAssets((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, processing_status: 'pending' } : a
      )
    )
  }, [])

  const downloadAsset = useCallback(async (id: string): Promise<string | null> => {
    const response = await fetch(`/api/assets/${id}/download`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('Failed to download asset')
    }

    const data = await response.json()
    return data.download_url || null
  }, [])

  return {
    assets,
    loading,
    error,
    uploadFiles,
    deleteAsset,
    updateAsset,
    retryProcessing,
    downloadAsset,
    refresh: fetchAssets,
  }
}
