'use client'

import { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react'
import { cn } from '@/lib/utils'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value?: string
  onSearch: (query: string) => void
  placeholder?: string
  className?: string
  debounceMs?: number
}

export function SearchBar({
  value: controlledValue,
  onSearch,
  placeholder = 'Search assets...',
  className,
  debounceMs = 300,
}: SearchBarProps) {
  const [value, setValue] = useState(controlledValue || '')
  const [focused, setFocused] = useState(false)

  // Sync with controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setValue(controlledValue)
    }
  }, [controlledValue])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [value, debounceMs, onSearch])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
  }

  const handleClear = useCallback(() => {
    setValue('')
    onSearch('')
  }, [onSearch])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(value)
  }

  return (
    <form onSubmit={handleSubmit} className={cn('relative w-full max-w-xl', className)}>
      <div
        className={cn(
          'flex items-center gap-3 w-full bg-gray-50 border rounded-xl px-4 py-3 transition-colors',
          focused ? 'border-accent bg-white shadow-sm' : 'border-gray-200'
        )}
      >
        <Search
          className={cn(
            'w-5 h-5 flex-shrink-0 transition-colors',
            focused ? 'text-accent' : 'text-gray-400'
          )}
        />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-body-sm placeholder:text-gray-400"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  )
}
