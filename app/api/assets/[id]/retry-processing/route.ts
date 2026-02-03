import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logError, logInfo } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/assets/[id]/retry-processing - Retry AI processing
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check asset exists
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('id, processing_status')
      .eq('id', id)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Set status to pending
    const { error: updateError } = await supabase
      .from('assets')
      .update({ processing_status: 'pending' })
      .eq('id', id)

    if (updateError) {
      logError(updateError, { assetId: id })
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    // Trigger AI processing
    fetch(`${request.nextUrl.origin}/api/ai/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset_id: id }),
    }).catch((err) => logError(err, { assetId: id }))

    logInfo('Retry processing triggered', { userId: user.id, assetId: id })

    return NextResponse.json({ success: true, status: 'pending' })
  } catch (error) {
    logError(error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
