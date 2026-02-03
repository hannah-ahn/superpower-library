import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateTags, generateSummary, analyzeImageContent } from './claude'
import { generateEmbedding } from './embeddings'
import { logError, logInfo } from '@/lib/logger'

export async function processAsset(assetId: string): Promise<void> {
  const supabase = await createServiceRoleClient()

  try {
    // Get asset
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .single()

    if (fetchError || !asset) {
      throw new Error(`Asset not found: ${assetId}`)
    }

    logInfo('Processing asset', { assetId, fileType: asset.file_type })

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('assets')
      .download(asset.storage_path)

    if (downloadError || !fileData) {
      throw new Error(`Failed to download asset: ${downloadError?.message}`)
    }

    let extractedText = ''
    let aiTags: string[] = []
    let aiSummary: string | null = null
    let thumbnailPath: string | null = null

    if (asset.file_type === 'image') {
      // Process image
      const arrayBuffer = await fileData.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')

      // Analyze with Claude vision
      const analysis = await analyzeImageContent(base64, asset.mime_type)
      extractedText = analysis.description
      aiTags = analysis.tags
      aiSummary = analysis.summary

      // Generate thumbnail (for now, we'll use the same image - in production use Sharp)
      // This is a simplified version - in production you'd resize with Sharp
      const tempThumbnailPath = asset.storage_path.replace('/original.', '/thumbnail.')

      // For now, just copy the original as thumbnail
      // In production, use Sharp to resize
      try {
        const { error: thumbError } = await supabase.storage
          .from('assets')
          .upload(tempThumbnailPath, arrayBuffer, {
            contentType: 'image/webp',
            upsert: true,
          })

        if (thumbError) {
          // Non-fatal, just log
          logError(thumbError, { assetId, message: 'Thumbnail generation failed' })
        } else {
          thumbnailPath = tempThumbnailPath
        }
      } catch {
        // Leave thumbnailPath as null
      }
    } else if (asset.file_type === 'pdf') {
      // Process PDF - extract text
      try {
        // Dynamic import for pdf-parse to avoid Next.js issues
        const pdfParse = (await import('pdf-parse')).default
        const buffer = Buffer.from(await fileData.arrayBuffer())
        const pdfData = await pdfParse(buffer)
        extractedText = pdfData.text

        // Generate tags and summary from extracted text
        if (extractedText) {
          aiTags = await generateTags(extractedText, 'pdf')
          aiSummary = await generateSummary(extractedText, 'pdf')
        }
      } catch (pdfError) {
        logError(pdfError as Error, { assetId, message: 'PDF parsing failed' })
        // Continue without PDF text
      }
    }

    // Generate embedding from combined text
    const combinedText = [
      asset.filename,
      aiSummary,
      extractedText,
      ...aiTags,
    ]
      .filter(Boolean)
      .join(' ')

    const embedding = await generateEmbedding(combinedText)

    // Update asset with AI data
    const updates: Record<string, unknown> = {
      processing_status: 'complete',
      ai_tags: aiTags,
      ai_summary: aiSummary,
      extracted_text: extractedText.substring(0, 10000), // Limit stored text
    }

    if (thumbnailPath) {
      updates.thumbnail_path = thumbnailPath
    }

    if (embedding) {
      updates.embedding = embedding
    }

    const { error: updateError } = await supabase
      .from('assets')
      .update(updates)
      .eq('id', assetId)

    if (updateError) {
      throw updateError
    }

    logInfo('Asset processing complete', {
      assetId,
      tagsCount: aiTags.length,
      hasSummary: !!aiSummary,
      hasEmbedding: !!embedding,
    })
  } catch (error) {
    logError(error as Error, { assetId })

    // Mark as failed
    await supabase
      .from('assets')
      .update({ processing_status: 'failed' })
      .eq('id', assetId)
  }
}
