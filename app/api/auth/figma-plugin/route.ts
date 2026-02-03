import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/auth/figma-plugin - Start Figma plugin OAuth flow
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const state = searchParams.get('state')

  if (!state) {
    return new Response('Missing state parameter', { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.auth.signInWithOtp({
    email: '', // Will be filled by user
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/figma-callback?state=${state}`,
    },
  })

  // Redirect to login page with figma plugin context
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', `/api/auth/figma-callback?state=${state}`)
  loginUrl.searchParams.set('context', 'figma-plugin')

  return NextResponse.redirect(loginUrl)
}
