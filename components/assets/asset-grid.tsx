'use client'

import { useState } from 'react'
import { AssetCard } from './asset-card'
import { AssetCardSkeleton } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Search, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import type { AssetWithDetails } from '@/types/database'

interface AssetGridProps {
  assets: AssetWithDetails[]
  loading?: boolean
  query?: string
  selectedIds?: Set<string>
  onAssetClick?: (asset: AssetWithDetails) => void
  onSelectionChange?: (ids: Set<string>) => void
  onBulkDownload?: (assets: AssetWithDetails[]) => void
  onBulkDelete?: (assets: AssetWithDetails[]) => void
}

export function AssetGrid({
  assets,
  loading,
  query,
  selectedIds = new Set(),
  onAssetClick,
  onSelectionChange,
  onBulkDownload,
  onBulkDelete,
}: AssetGridProps) {
  const [selectionMode, setSelectionMode] = useState(false)

  const toggleSelection = (assetId: string) => {
    const newIds = new Set(selectedIds)
    if (newIds.has(assetId)) {
      newIds.delete(assetId)
    } else {
      newIds.add(assetId)
    }
    onSelectionChange?.(newIds)

    // Exit selection mode if nothing selected
    if (newIds.size === 0) {
      setSelectionMode(false)
    }
  }

  const selectAll = () => {
    onSelectionChange?.(new Set(assets.map((a) => a.id)))
  }

  const clearSelection = () => {
    onSelectionChange?.(new Set())
    setSelectionMode(false)
  }

  const handleBulkDownload = () => {
    const selectedAssets = assets.filter((a) => selectedIds.has(a.id))
    onBulkDownload?.(selectedAssets)
  }

  const handleBulkDelete = () => {
    const selectedAssets = assets.filter((a) => selectedIds.has(a.id))
    onBulkDelete?.(selectedAssets)
  }

  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <AssetCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Empty state
  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Search className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-h3 text-gray-900 mb-2">
          {query ? `No assets found for "${query}"` : 'No assets yet'}
        </h3>
        <p className="text-body-sm text-gray-500">
          {query ? 'Try a different search term' : 'Upload your first asset to get started'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 bg-white border border-gray-200 rounded-lg shadow-sm p-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-body-sm font-medium text-gray-900">
              {selectedIds.size} selected
            </span>
            <button
              onClick={selectAll}
              className="text-body-sm text-accent hover:text-accent-hover"
            >
              Select all
            </button>
            <button
              onClick={clearSelection}
              className="text-body-sm text-gray-500 hover:text-gray-700"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Download All
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All
            </Button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div
        className={cn(
          'grid gap-4',
          'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
        )}
      >
        {assets.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            selected={selectedIds.has(asset.id)}
            selectionMode={selectionMode || selectedIds.size > 0}
            onSelect={() => {
              if (!selectionMode && selectedIds.size === 0) {
                setSelectionMode(true)
              }
              toggleSelection(asset.id)
            }}
            onClick={() => onAssetClick?.(asset)}
          />
        ))}
      </div>
    </div>
  )
}
