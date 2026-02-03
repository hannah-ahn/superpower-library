'use client'

import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface TagPillProps {
  tag: string
  variant?: 'ai' | 'user' | 'default'
  onRemove?: () => void
  onClick?: () => void
}

export function TagPill({ tag, variant = 'default', onRemove, onClick }: TagPillProps) {
  const variants = {
    ai: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    user: 'bg-green-50 text-green-600 hover:bg-green-100',
    default: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-caption font-medium transition-colors',
        variants[variant],
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      {tag}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="hover:bg-black/10 rounded p-0.5 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}
