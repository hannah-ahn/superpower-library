import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logError, logInfo } from '@/lib/logger'
import { v4 as uuidv4 } from 'uuid'

// POST /api/invite - Generate invite link
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate a short code
    const code = uuidv4().substring(0, 8)

    // Create invite link
    const { data: invite, error } = await supabase
      .from('invite_links')
      .insert({
        created_by: user.id,
        code,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single()

    if (error) {
      logError(error, { userId: user.id })
      return NextResponse.json({ error: 'Failed to create invite link' }, { status: 500 })
    }

    const url = `${request.nextUrl.origin}/join/${code}`

    logInfo('Invite link created', { userId: user.id, code })

    return NextResponse.json({ code, url })
  } catch (error) {
    logError(error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
