'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui'
import { FileText, ImageIcon, Check } from 'lucide-react'
import type { AssetWithDetails } from '@/types/database'

interface AssetCardProps {
  asset: AssetWithDetails
  selected?: boolean
  selectionMode?: boolean
  onSelect?: () => void
  onClick?: () => void
}

export function AssetCard({
  asset,
  selected,
  selectionMode,
  onSelect,
  onClick,
}: AssetCardProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const allTags = [...asset.ai_tags, ...asset.user_tags]
  const visibleTags = allTags.slice(0, 3)
  const remainingCount = allTags.length - 3

  const handleClick = () => {
    if (selectionMode && onSelect) {
      onSelect()
    } else if (onClick) {
      onClick()
    }
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect?.()
  }

  return (
    <div
      className={cn(
        'bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group',
        selected && 'ring-2 ring-accent'
      )}
      onClick={handleClick}
    >
      {/* Selection checkbox */}
      {(selectionMode || selected) && (
        <div
          className={cn(
            'absolute top-2 left-2 z-10',
            !selectionMode && 'opacity-0 group-hover:opacity-100 transition-opacity'
          )}
        >
          <button
            onClick={handleCheckboxClick}
            className={cn(
              'w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors',
              selected
                ? 'bg-accent border-accent text-white'
                : 'bg-white/80 border-gray-300 hover:border-accent'
            )}
          >
            {selected && <Check className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Thumbnail */}
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 mb-3">
        {asset.processing_status === 'pending' && (
          <div className="absolute inset-0 bg-gray-200 shimmer" />
        )}

        {asset.file_type === 'image' && asset.thumbnail_url && !imageError ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            <Image
              src={asset.thumbnail_url}
              alt={asset.filename}
              fill
              className={cn(
                'object-cover transition-opacity',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            {asset.file_type === 'pdf' ? (
              <FileText className="w-12 h-12 mb-2" />
            ) : (
              <ImageIcon className="w-12 h-12 mb-2" />
            )}
            <span className="text-caption truncate max-w-[80%]">
              {asset.filename}
            </span>
          </div>
        )}

        {/* Processing badge */}
        {asset.processing_status === 'pending' && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="processing">Processing...</Badge>
          </div>
        )}

        {asset.processing_status === 'failed' && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="error">Processing failed</Badge>
          </div>
        )}
      </div>

      {/* File info */}
      <p className="text-body-sm font-medium text-gray-900 truncate mb-1">
        {asset.filename}
      </p>
      <p className="text-caption text-gray-500 mb-3">
        Uploaded by {asset.uploader?.display_name || 'Unknown'}
      </p>

      {/* Tags */}
      {visibleTags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {visibleTags.map((tag, index) => (
            <Badge
              key={`${tag}-${index}`}
              variant={asset.ai_tags.includes(tag) ? 'ai' : 'user'}
            >
              {tag}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Badge variant="default">+{remainingCount}</Badge>
          )}
        </div>
      )}
    </div>
  )
}
