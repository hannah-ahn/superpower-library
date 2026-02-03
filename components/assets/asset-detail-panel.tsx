'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Button, Badge, Input, DetailPanelSkeleton, ConfirmDialog } from '@/components/ui'
import { TagInput } from '@/components/tags/tag-input'
import {
  ArrowLeft,
  Trash2,
  Download,
  FileText,
  ImageIcon,
  Pencil,
  RefreshCw,
  X,
  Check,
} from 'lucide-react'
import { validateFilename } from '@/lib/utils/file'
import type { AssetWithDetails } from '@/types/database'

interface AssetDetailPanelProps {
  asset: AssetWithDetails | null
  loading?: boolean
  onClose: () => void
  onDownload?: (asset: AssetWithDetails) => void
  onDelete?: (asset: AssetWithDetails) => void
  onUpdate?: (asset: AssetWithDetails, updates: Partial<AssetWithDetails>) => void
  onRetryProcessing?: (asset: AssetWithDetails) => void
}

export function AssetDetailPanel({
  asset,
  loading,
  onClose,
  onDownload,
  onDelete,
  onUpdate,
  onRetryProcessing,
}: AssetDetailPanelProps) {
  const [editingFilename, setEditingFilename] = useState(false)
  const [filename, setFilename] = useState('')
  const [filenameError, setFilenameError] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (asset) {
      setFilename(asset.filename)
      setImageError(false)
    }
  }, [asset?.id])

  const handleFilenameSubmit = () => {
    if (!asset) return

    const validation = validateFilename(filename)
    if (!validation.valid) {
      setFilenameError(validation.error || 'Invalid filename')
      return
    }

    onUpdate?.(asset, { filename })
    setEditingFilename(false)
    setFilenameError('')
  }

  const handleFilenameCancel = () => {
    if (asset) {
      setFilename(asset.filename)
    }
    setEditingFilename(false)
    setFilenameError('')
  }

  const handleTagsUpdate = (tags: string[]) => {
    if (!asset) return
    onUpdate?.(asset, { user_tags: tags })
  }

  const handleDelete = async () => {
    if (!asset) return

    setDeleting(true)
    try {
      await onDelete?.(asset)
      setShowDeleteDialog(false)
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (!asset && !loading) {
    return null
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}>
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl z-50',
          'animate-slide-in-right overflow-y-auto scrollbar-thin'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {asset && (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="text-gray-500 hover:text-error transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {loading ? (
          <DetailPanelSkeleton />
        ) : asset ? (
          <div className="p-6 space-y-6">
            {/* Preview */}
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
              {asset.file_type === 'image' && asset.url && !imageError ? (
                <Image
                  src={asset.url}
                  alt={asset.filename}
                  fill
                  className="object-contain"
                  onError={() => setImageError(true)}
                  sizes="480px"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  {asset.file_type === 'pdf' ? (
                    <FileText className="w-16 h-16 mb-3" />
                  ) : (
                    <ImageIcon className="w-16 h-16 mb-3" />
                  )}
                  <span className="text-body-sm">{asset.filename}</span>
                </div>
              )}
            </div>

            {/* Filename */}
            <div>
              {editingFilename ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    error={filenameError}
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFilenameSubmit()
                      if (e.key === 'Escape') handleFilenameCancel()
                    }}
                  />
                  <button
                    onClick={handleFilenameSubmit}
                    className="p-2 text-success hover:bg-success/10 rounded-lg transition-colors"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleFilenameCancel}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 group cursor-pointer"
                  onClick={() => setEditingFilename(true)}
                >
                  <h2 className="text-h3 text-gray-900 break-all">{asset.filename}</h2>
                  <Pencil className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="text-body-sm text-gray-500 space-y-1">
              <p>
                Uploaded by {asset.uploader?.display_name || 'Unknown'} ·{' '}
                {formatDate(asset.created_at)}
              </p>
              <p>Downloaded {asset.download_count} times</p>
            </div>

            <div className="border-t border-gray-100" />

            {/* TLDR / Summary */}
            <div>
              <h3 className="text-body-sm font-medium text-gray-700 mb-2">TLDR</h3>
              {asset.processing_status === 'pending' ? (
                <div className="bg-gray-50 rounded-lg p-4 text-body-sm text-gray-500 animate-pulse">
                  Analyzing asset...
                </div>
              ) : asset.ai_summary ? (
                <p className="text-body-sm text-gray-600 bg-gray-50 rounded-lg p-4">
                  {asset.ai_summary}
                </p>
              ) : (
                <p className="text-body-sm text-gray-400 italic">
                  Summary unavailable
                </p>
              )}
            </div>

            <div className="border-t border-gray-100" />

            {/* Tags */}
            <div>
              <h3 className="text-body-sm font-medium text-gray-700 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {asset.ai_tags.map((tag, index) => (
                  <Badge
                    key={`ai-${tag}-${index}`}
                    variant="ai"
                    removable
                    onRemove={() => {
                      // AI tags can't be removed, but we can add them to user tags to "override"
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
                {asset.user_tags.map((tag, index) => (
                  <Badge
                    key={`user-${tag}-${index}`}
                    variant="user"
                    removable
                    onRemove={() => {
                      handleTagsUpdate(asset.user_tags.filter((t) => t !== tag))
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              <TagInput
                onAddTag={(tag) => {
                  if (!asset.user_tags.includes(tag)) {
                    handleTagsUpdate([...asset.user_tags, tag])
                  }
                }}
              />
            </div>

            <div className="border-t border-gray-100" />

            {/* Download button */}
            <Button
              className="w-full"
              onClick={() => onDownload?.(asset)}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>

            {/* Processing failed state */}
            {asset.processing_status === 'failed' && (
              <>
                <div className="border-t border-gray-100" />
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 text-error">
                    <span className="text-body-sm">AI processing failed</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onRetryProcessing?.(asset)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title={`Delete ${asset?.filename}?`}
        description="This can't be undone."
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleting}
      />
    </>
  )
}
