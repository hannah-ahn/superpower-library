'use client'

import { useState, useCallback, useRef } from 'react'
import type { AssetWithDetails } from '@/types/database'

interface UseSearchReturn {
  results: AssetWithDetails[]
  loading: boolean
  error: string | null
  query: string
  search: (query: string) => Promise<void>
  clear: () => void
}

export function useSearch(): UseSearchReturn {
  const [results, setResults] = useState<AssetWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  const search = useCallback(async (searchQuery: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setQuery(searchQuery)

    if (!searchQuery.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`,
        { signal: controller.signal }
      )

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.assets || [])
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
  }, [])

  return {
    results,
    loading,
    error,
    query,
    search,
    clear,
  }
}
