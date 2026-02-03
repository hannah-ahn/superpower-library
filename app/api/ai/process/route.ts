import { NextRequest, NextResponse } from 'next/server'
import { processAsset } from '@/lib/ai/process-asset'
import { logError, logInfo } from '@/lib/logger'

// POST /api/ai/process - Process asset with AI
export async function POST(request: NextRequest) {
  try {
    const { asset_id } = await request.json()

    if (!asset_id) {
      return NextResponse.json({ error: 'asset_id is required' }, { status: 400 })
    }

    logInfo('Starting AI processing', { assetId: asset_id })

    // Process in background (don't await)
    processAsset(asset_id).catch((error) => {
      logError(error as Error, { assetId: asset_id })
    })

    return NextResponse.json({ success: true, status: 'processing' })
  } catch (error) {
    logError(error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
