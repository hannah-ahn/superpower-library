'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input } from '@/components/ui'
import { useToast } from '@/components/ui/toast'

export default function JoinPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [isValidCode, setIsValidCode] = useState(false)
  const [sent, setSent] = useState(false)
  const router = useRouter()
  const params = useParams()
  const { addToast } = useToast()
  const code = params.code as string

  useEffect(() => {
    // Validate invite code
    async function validateCode() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        // If already logged in with superpower email, auto-join
        if (user?.email?.endsWith('@superpower.com')) {
          const response = await fetch('/api/auth/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invite_code: code }),
          })

          if (response.ok) {
            addToast('Welcome to Superpower Library!', 'success')
            router.push('/')
            return
          }
        }

        // Check if code is valid
        const { data, error } = await supabase
          .from('invite_links')
          .select('code, expires_at')
          .eq('code', code)
          .single()

        if (error || !data) {
          setIsValidCode(false)
        } else if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setIsValidCode(false)
        } else {
          setIsValidCode(true)
        }
      } catch {
        setIsValidCode(false)
      } finally {
        setValidating(false)
      }
    }

    validateCode()
  }, [code, router, addToast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.endsWith('@superpower.com')) {
      addToast('You need a @superpower.com email to join.', 'error')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/join/${code}`,
        },
      })

      if (error) {
        throw error
      }

      setSent(true)
      addToast('Check your email for a login link!', 'success')
    } catch (error) {
      console.error('Login error:', error)
      addToast('Failed to send login link. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto" />
        <p className="text-body-sm text-gray-500 mt-4">Validating invite link...</p>
      </div>
    )
  }

  if (!isValidCode) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-error"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="text-h3 text-gray-900 mb-2">Invalid invite link</h2>
        <p className="text-body-sm text-gray-500 mb-6">
          This invite link is invalid or has expired.
        </p>
        <Button variant="secondary" onClick={() => router.push('/login')}>
          Go to Login
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-xl">S</span>
        </div>
        <h1 className="text-h2 text-gray-900 mb-2">Join Superpower Library</h1>
        <p className="text-body-sm text-gray-500">
          Sign in with your @superpower.com email to join
        </p>
      </div>

      {sent ? (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-success"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-h3 text-gray-900 mb-2">Check your email</h2>
          <p className="text-body-sm text-gray-500 mb-6">
            We sent a login link to <strong>{email}</strong>
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-body-sm text-accent hover:text-accent-hover"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@superpower.com"
            required
            autoFocus
          />
          <Button type="submit" loading={loading} className="w-full">
            Join Library
          </Button>
        </form>
      )}
    </div>
  )
}
