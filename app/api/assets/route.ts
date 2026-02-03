import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logError, logInfo } from '@/lib/logger'
import { sanitizeFilename, getFileType } from '@/lib/utils/file'
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@/types/database'
import { v4 as uuidv4 } from 'uuid'

// GET /api/assets - List assets
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const fileType = searchParams.get('file_type')
    const uploadedBy = searchParams.get('uploaded_by')

    const offset = (page - 1) * limit

    let query = supabase
      .from('assets')
      .select(`
        *,
        uploader:profiles!uploaded_by(id, email, display_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fileType) {
      query = query.eq('file_type', fileType)
    }

    if (uploadedBy) {
      query = query.eq('uploaded_by', uploadedBy)
    }

    const { data: assets, count, error } = await query

    if (error) {
      logError(error, { userId: user.id })
      return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
    }

    // Get signed URLs for assets
    const assetsWithUrls = await Promise.all(
      (assets || []).map(async (asset) => {
        const { data: urlData } = await supabase.storage
          .from('assets')
          .createSignedUrl(asset.storage_path, 3600) // 1 hour

        let thumbnailUrl = null
        if (asset.thumbnail_path) {
          const { data: thumbData } = await supabase.storage
            .from('assets')
            .createSignedUrl(asset.thumbnail_path, 3600)
          thumbnailUrl = thumbData?.signedUrl
        }

        return {
          ...asset,
          url: urlData?.signedUrl,
          thumbnail_url: thumbnailUrl,
        }
      })
    )

    return NextResponse.json({
      data: assetsWithUrls,
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (error) {
    logError(error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/assets - Upload asset
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 3GB.' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only images and PDFs are supported.' }, { status: 400 })
    }

    const fileType = getFileType(file.type)
    if (!fileType) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    const assetId = uuidv4()
    const sanitizedFilename = sanitizeFilename(file.name)
    const extension = file.name.split('.').pop() || ''
    const storagePath = `${user.id}/${assetId}/original.${extension}`

    // Upload file to storage
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      logError(uploadError, { userId: user.id, assetId })
      return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
    }

    // Create asset record
    const { data: asset, error: insertError } = await supabase
      .from('assets')
      .insert({
        id: assetId,
        uploaded_by: user.id,
        filename: sanitizedFilename,
        original_filename: file.name,
        file_type: fileType,
        mime_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        processing_status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      logError(insertError, { userId: user.id, assetId })
      // Clean up uploaded file
      await supabase.storage.from('assets').remove([storagePath])
      return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 })
    }

    // Trigger async AI processing (fire and forget)
    fetch(`${request.nextUrl.origin}/api/ai/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset_id: assetId }),
    }).catch((err) => logError(err, { assetId }))

    logInfo('Asset uploaded', { userId: user.id, assetId, filename: sanitizedFilename })

    return NextResponse.json({
      asset,
      message: `Uploaded ${sanitizedFilename}`,
    })
  } catch (error) {
    logError(error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
