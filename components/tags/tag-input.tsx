'use client'

import { useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

interface TagInputProps {
  onAddTag: (tag: string) => void
  placeholder?: string
  className?: string
}

export function TagInput({
  onAddTag,
  placeholder = 'Add a tag...',
  className,
}: TagInputProps) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)

  const handleSubmit = () => {
    const tag = value.trim().toLowerCase()
    if (tag) {
      onAddTag(tag)
      setValue('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
        focused ? 'border-accent bg-white' : 'border-gray-200 bg-gray-50',
        className
      )}
    >
      <Plus className={cn('w-4 h-4', focused ? 'text-accent' : 'text-gray-400')} />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-body-sm placeholder:text-gray-400"
      />
      {value && (
        <button
          type="button"
          onClick={handleSubmit}
          className="text-caption text-accent hover:text-accent-hover font-medium"
        >
          Add
        </button>
      )}
    </div>
  )
}
