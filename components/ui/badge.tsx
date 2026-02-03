'use client'

import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'ai' | 'user' | 'processing' | 'error'
  removable?: boolean
  onRemove?: () => void
}

export function Badge({
  className,
  variant = 'default',
  removable,
  onRemove,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-600',
    ai: 'bg-blue-50 text-blue-600',
    user: 'bg-green-50 text-green-600',
    processing: 'bg-gray-100 text-gray-500 animate-pulse',
    error: 'bg-red-50 text-red-600',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-caption font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
      {removable && onRemove && (
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
