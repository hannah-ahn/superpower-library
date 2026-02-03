import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logError, logInfo } from '@/lib/logger'
import { validateFilename } from '@/lib/utils/file'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/assets/[id] - Get single asset
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createServiceRoleClient()

    // DEVELOPMENT: Auth disabled
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || 'dev-user-id'

    const { data: asset, error } = await supabase
      .from('assets')
      .select(`
        *,
        uploader:profiles!uploaded_by(id, email, display_name)
      `)
      .eq('id', id)
      .single()

    if (error || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Get signed URLs
    const { data: urlData } = await supabase.storage
      .from('assets')
      .createSignedUrl(asset.storage_path, 3600)

    let thumbnailUrl = null
    if (asset.thumbnail_path) {
      const { data: thumbData } = await supabase.storage
        .from('assets')
        .createSignedUrl(asset.thumbnail_path, 3600)
      thumbnailUrl = thumbData?.signedUrl
    }

    return NextResponse.json({
      ...asset,
      url: urlData?.signedUrl,
      thumbnail_url: thumbnailUrl,
    })
  } catch (error) {
    logError(error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/assets/[id] - Update asset
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createServiceRoleClient()

    // DEVELOPMENT: Auth disabled
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || 'dev-user-id'

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    // Validate and add filename
    if (body.filename !== undefined) {
      const validation = validateFilename(body.filename)
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
      updates.filename = body.filename
    }

    // Add user tags
    if (body.user_tags !== undefined) {
      if (!Array.isArray(body.user_tags)) {
        return NextResponse.json({ error: 'user_tags must be an array' }, { status: 400 })
      }
      updates.user_tags = body.user_tags
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
    }

    const { data: asset, error } = await supabase
      .from('assets')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        uploader:profiles!uploaded_by(id, email, display_name)
      `)
      .single()

    if (error) {
      logError(error, { userId, assetId: id })
      return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 })
    }

    logInfo('Asset updated', { userId, assetId: id, updates })

    return NextResponse.json(asset)
  } catch (error) {
    logError(error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/assets/[id] - Delete asset
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createServiceRoleClient()

    // DEVELOPMENT: Auth disabled
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || 'dev-user-id'

    // Get asset to find storage paths
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('storage_path, thumbnail_path')
      .eq('id', id)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Delete from storage
    const pathsToDelete = [asset.storage_path]
    if (asset.thumbnail_path) {
      pathsToDelete.push(asset.thumbnail_path)
    }

    await supabase.storage.from('assets').remove(pathsToDelete)

    // Delete from database (will cascade delete downloads)
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', id)

    if (deleteError) {
      logError(deleteError, { userId: user.id, assetId: id })
      return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 })
    }

    logInfo('Asset deleted', { userId, assetId: id })

    return NextResponse.json({ success: true })
  } catch (error) {
    logError(error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
