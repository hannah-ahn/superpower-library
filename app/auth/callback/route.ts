import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // If redirect contains /join/, handle the join flow
      if (redirect.includes('/join/')) {
        const inviteCode = redirect.split('/join/')[1]
        if (inviteCode) {
          // Join via API
          const response = await fetch(`${origin}/api/auth/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invite_code: inviteCode }),
          })

          if (response.ok) {
            return NextResponse.redirect(new URL('/', origin))
          }
        }
      }

      return NextResponse.redirect(new URL(redirect, origin))
    }
  }

  // Auth failed
  return NextResponse.redirect(new URL('/login?error=auth_failed', origin))
}
