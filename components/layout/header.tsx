'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button, Dialog } from '@/components/ui'
import { SearchBar } from '@/components/search'
import { AssetUpload } from '@/components/assets'
import { Plus, LogOut, Link as LinkIcon, Copy, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  searchQuery?: string
  onSearch?: (query: string) => void
  onUpload?: (files: File[]) => Promise<void>
  user?: {
    email: string
    display_name?: string | null
  }
}

export function Header({ searchQuery, onSearch, onUpload, user }: HeaderProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true)
    try {
      const response = await fetch('/api/invite', { method: 'POST' })
      const data = await response.json()
      if (data.url) {
        setInviteLink(data.url)
      }
    } catch (error) {
      console.error('Failed to generate invite:', error)
    } finally {
      setGeneratingInvite(false)
    }
  }

  const handleCopyInvite = async () => {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUpload = async (files: File[]) => {
    await onUpload?.(files)
    setShowUploadDialog(false)
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-h3 text-gray-900 hidden sm:block">Library</span>
            </Link>

            {/* Search */}
            {onSearch && (
              <SearchBar
                value={searchQuery}
                onSearch={onSearch}
                className="flex-1 max-w-2xl"
              />
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setInviteLink('')
                  setShowInviteDialog(true)
                }}
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Invite</span>
              </Button>

              <Button onClick={() => setShowUploadDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Upload</span>
              </Button>

              {user && (
                <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                  <span className="text-body-sm text-gray-600 hidden md:block">
                    {user.display_name || user.email.split('@')[0]}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Upload Dialog */}
      <Dialog
        open={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        title="Upload Assets"
      >
        <AssetUpload onUpload={handleUpload} />
      </Dialog>

      {/* Invite Dialog */}
      <Dialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        title="Invite Teammates"
        description="Share this link with teammates who have a @superpower.com email."
      >
        {inviteLink ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 bg-transparent text-body-sm text-gray-700 outline-none"
              />
              <button
                onClick={handleCopyInvite}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  copied
                    ? 'bg-success/10 text-success'
                    : 'hover:bg-gray-100 text-gray-500'
                )}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setShowInviteDialog(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleGenerateInvite}
            loading={generatingInvite}
            className="w-full"
          >
            Generate Invite Link
          </Button>
        )}
      </Dialog>
    </>
  )
}
