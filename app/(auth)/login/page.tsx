'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input } from '@/components/ui'
import { useToast } from '@/components/ui/toast'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  const redirectTo = searchParams.get('redirect') || '/'

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
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
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

  return (
    <>
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
            Continue with Email
          </Button>
        </form>
      )}
    </>
  )
}

function LoginFormFallback() {
  return (
    <div className="space-y-4">
      <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
      <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-xl">S</span>
        </div>
        <h1 className="text-h2 text-gray-900 mb-2">Superpower Library</h1>
        <p className="text-body-sm text-gray-500">
          Sign in with your @superpower.com email
        </p>
      </div>

      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
