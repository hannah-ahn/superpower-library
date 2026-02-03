import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logError, logInfo } from '@/lib/logger'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/assets/[id]/download - Download asset
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createServiceRoleClient()

    // DEVELOPMENT: Auth disabled
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || 'dev-user-id'

    // Get asset
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('id, storage_path, filename')
      .eq('id', id)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Create signed download URL
    const { data: urlData, error: urlError } = await supabase.storage
      .from('assets')
      .createSignedUrl(asset.storage_path, 3600, {
        download: asset.filename,
      })

    if (urlError || !urlData?.signedUrl) {
      logError(urlError || new Error('Failed to create signed URL'), { assetId: id })
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }

    // Increment download count
    try {
      const { error: rpcError } = await supabase.rpc('increment_download_count', { asset_id: id })
      if (rpcError) {
        // If the RPC doesn't exist, fall back to a direct update
        await supabase
          .from('assets')
          .update({ download_count: (asset as Record<string, unknown>).download_count as number + 1 })
          .eq('id', id)
      }
    } catch {
      // Fallback to direct update
      await supabase
        .from('assets')
        .update({ download_count: (asset as Record<string, unknown>).download_count as number + 1 })
        .eq('id', id)
    }

    // Record download
    await supabase.from('downloads').insert({
      asset_id: id,
      downloaded_by: userId,
    })

    logInfo('Asset downloaded', { userId, assetId: id })

    return NextResponse.json({ download_url: urlData.signedUrl })
  } catch (error) {
    logError(error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/assets/[id]/download - List downloads
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createServiceRoleClient()

    // DEVELOPMENT: Auth disabled
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || 'dev-user-id'

    const { data: downloads, error, count } = await supabase
      .from('downloads')
      .select(`
        *,
        user:profiles!downloaded_by(id, email, display_name)
      `, { count: 'exact' })
      .eq('asset_id', id)
      .order('downloaded_at', { ascending: false })
      .limit(100)

    if (error) {
      logError(error, { assetId: id })
      return NextResponse.json({ error: 'Failed to fetch downloads' }, { status: 500 })
    }

    return NextResponse.json({
      downloads: downloads || [],
      total: count || 0,
    })
  } catch (error) {
    logError(error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
