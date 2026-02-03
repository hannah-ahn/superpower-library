'use client'

import { useState, useCallback, useEffect } from 'react'
import { Header } from '@/components/layout'
import { AssetGrid, AssetDetailPanel } from '@/components/assets'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui'
import { useAssets } from '@/hooks/use-assets'
import { useSearch } from '@/hooks/use-search'
import type { AssetWithDetails } from '@/types/database'

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<AssetWithDetails | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [assetsToDelete, setAssetsToDelete] = useState<AssetWithDetails[]>([])
  const [user, setUser] = useState<{ email: string; display_name?: string | null } | null>(null)
  const { addToast } = useToast()

  const {
    assets,
    loading,
    uploadFiles,
    deleteAsset,
    updateAsset,
    retryProcessing,
    downloadAsset,
    refresh,
  } = useAssets()

  const { results: searchResults, loading: searchLoading, search } = useSearch()

  // Get current user
  useEffect(() => {
    async function getUser() {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    }
    getUser()
  }, [])

  const displayAssets = searchQuery ? searchResults : assets

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)
      if (query) {
        search(query)
      }
    },
    [search]
  )

  const handleUpload = useCallback(
    async (files: File[]) => {
      try {
        await uploadFiles(files)
        addToast(`Uploaded ${files.length} file${files.length !== 1 ? 's' : ''}`, 'success')
      } catch {
        addToast('Upload failed. Please try again.', 'error')
      }
    },
    [uploadFiles, addToast]
  )

  const handleAssetClick = useCallback((asset: AssetWithDetails) => {
    setSelectedAsset(asset)
  }, [])

  const handleDownload = useCallback(
    async (asset: AssetWithDetails) => {
      try {
        const url = await downloadAsset(asset.id)
        if (url) {
          window.open(url, '_blank')
        }
      } catch {
        addToast("Couldn't download asset. Please try again.", 'error')
      }
    },
    [downloadAsset, addToast]
  )

  const handleDelete = useCallback(
    async (asset: AssetWithDetails) => {
      try {
        await deleteAsset(asset.id)
        addToast(`Deleted ${asset.filename}`, 'success')
        setSelectedAsset(null)
      } catch {
        addToast("Couldn't delete asset. Please try again.", 'error')
      }
    },
    [deleteAsset, addToast]
  )

  const handleUpdate = useCallback(
    async (asset: AssetWithDetails, updates: Partial<AssetWithDetails>) => {
      try {
        await updateAsset(asset.id, updates)
      } catch {
        addToast("Couldn't update asset. Please try again.", 'error')
      }
    },
    [updateAsset, addToast]
  )

  const handleRetryProcessing = useCallback(
    async (asset: AssetWithDetails) => {
      try {
        await retryProcessing(asset.id)
        addToast('Processing restarted', 'info')
      } catch {
        addToast("Couldn't restart processing. Please try again.", 'error')
      }
    },
    [retryProcessing, addToast]
  )

  const handleBulkDownload = useCallback(
    async (assets: AssetWithDetails[]) => {
      for (const asset of assets) {
        try {
          const url = await downloadAsset(asset.id)
          if (url) {
            // Create a temporary link and click it
            const link = document.createElement('a')
            link.href = url
            link.download = asset.filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }
        } catch {
          console.error('Failed to download:', asset.filename)
        }
      }
      addToast(`Downloaded ${assets.length} files`, 'success')
      setSelectedIds(new Set())
    },
    [downloadAsset, addToast]
  )

  const handleBulkDelete = useCallback((assets: AssetWithDetails[]) => {
    setAssetsToDelete(assets)
    setShowBulkDeleteDialog(true)
  }, [])

  const confirmBulkDelete = useCallback(async () => {
    try {
      for (const asset of assetsToDelete) {
        await deleteAsset(asset.id)
      }
      addToast(`Deleted ${assetsToDelete.length} assets`, 'success')
      setSelectedIds(new Set())
      setShowBulkDeleteDialog(false)
      setAssetsToDelete([])
    } catch {
      addToast("Couldn't delete some assets. Please try again.", 'error')
    }
  }, [assetsToDelete, deleteAsset, addToast])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onUpload={handleUpload}
        user={user || undefined}
      />

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <AssetGrid
          assets={displayAssets}
          loading={loading || searchLoading}
          query={searchQuery}
          selectedIds={selectedIds}
          onAssetClick={handleAssetClick}
          onSelectionChange={setSelectedIds}
          onBulkDownload={handleBulkDownload}
          onBulkDelete={handleBulkDelete}
        />
      </main>

      {/* Detail panel */}
      {selectedAsset && (
        <AssetDetailPanel
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          onRetryProcessing={handleRetryProcessing}
        />
      )}

      {/* Bulk delete confirmation */}
      <ConfirmDialog
        open={showBulkDeleteDialog}
        onClose={() => {
          setShowBulkDeleteDialog(false)
          setAssetsToDelete([])
        }}
        onConfirm={confirmBulkDelete}
        title={`Delete ${assetsToDelete.length} assets?`}
        description="This can't be undone."
        confirmText="Delete All"
        confirmVariant="danger"
      />
    </div>
  )
}
