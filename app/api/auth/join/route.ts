import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logError, logInfo } from '@/lib/logger'

// POST /api/auth/join - Join via invite code
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { invite_code } = await request.json()

    if (!invite_code) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
    }

    // Validate invite code
    const { data: invite, error: inviteError } = await supabase
      .from('invite_links')
      .select('*')
      .eq('code', invite_code)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid invite link.' }, { status: 400 })
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite link has expired.' }, { status: 400 })
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
    }

    // Validate email domain
    if (!user.email?.endsWith('@superpower.com')) {
      return NextResponse.json(
        { error: 'You need a @superpower.com email to join.' },
        { status: 403 }
      )
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!existingProfile) {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          display_name: user.email.split('@')[0],
        })

      if (profileError) {
        logError(profileError, { userId: user.id })
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }
    }

    logInfo('User joined via invite', { userId: user.id, inviteCode: invite_code })

    return NextResponse.json({ success: true })
  } catch (error) {
    logError(error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
