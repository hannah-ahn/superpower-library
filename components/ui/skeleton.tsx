'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gray-200 rounded animate-pulse',
        className
      )}
    />
  )
}

export function AssetCardSkeleton() {
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm">
      <Skeleton className="w-full aspect-square rounded-lg mb-3" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2 mb-3" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-12 rounded-md" />
        <Skeleton className="h-5 w-12 rounded-md" />
        <Skeleton className="h-5 w-12 rounded-md" />
      </div>
    </div>
  )
}

export function DetailPanelSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="w-full aspect-video rounded-lg" />
      <div>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="border-t pt-6">
        <Skeleton className="h-4 w-16 mb-3" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
      <div className="border-t pt-6">
        <Skeleton className="h-4 w-12 mb-3" />
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-14 rounded-md" />
        </div>
      </div>
    </div>
  )
}
