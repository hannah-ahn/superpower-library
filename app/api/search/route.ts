import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'
import { generateEmbedding } from '@/lib/ai/embeddings'

// GET /api/search?q=query
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient()

    // DEVELOPMENT: Auth disabled
    // const { data: { user } } = await supabase.auth.getUser()
    // const userId = user?.id || 'dev-user-id'

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Step 1: Keyword search (filename and tags)
    const keywordResults = await searchByKeywords(supabase, query)

    // Step 2: Semantic search (embeddings)
    const semanticResults = await searchBySemantics(supabase, query)

    // Step 3: Combine and rank results
    const combinedResults = combineAndRankResults(keywordResults, semanticResults, query)

    // Get signed URLs for results
    const resultsWithUrls = await Promise.all(
      combinedResults.slice(0, 50).map(async (asset) => {
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

        return {
          ...asset,
          url: urlData?.signedUrl,
          thumbnail_url: thumbnailUrl,
        }
      })
    )

    return NextResponse.json({
      assets: resultsWithUrls,
      total: resultsWithUrls.length,
      query,
    })
  } catch (error) {
    logError(error as Error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}

async function searchByKeywords(supabase: any, query: string) {
  const keywords = query.toLowerCase().split(/\s+/)

  // Search by filename
  let filenameQuery = supabase
    .from('assets')
    .select(`
      *,
      uploader:profiles!uploaded_by(id, email, display_name)
    `)
    .ilike('filename', `%${query}%`)
    .limit(25)

  const { data: filenameMatches } = await filenameQuery

  // Search by tags
  let tagMatches: any[] = []
  for (const keyword of keywords) {
    const { data: aiTagMatches } = await supabase
      .from('assets')
      .select(`
        *,
        uploader:profiles!uploaded_by(id, email, display_name)
      `)
      .contains('ai_tags', [keyword])
      .limit(25)

    const { data: userTagMatches } = await supabase
      .from('assets')
      .select(`
        *,
        uploader:profiles!uploaded_by(id, email, display_name)
      `)
      .contains('user_tags', [keyword])
      .limit(25)

    if (aiTagMatches) tagMatches.push(...aiTagMatches)
    if (userTagMatches) tagMatches.push(...userTagMatches)
  }

  // Combine and dedupe
  const allMatches = [...(filenameMatches || []), ...tagMatches]
  const uniqueMatches = Array.from(
    new Map(allMatches.map((item) => [item.id, item])).values()
  )

  return uniqueMatches.map((item) => ({
    ...item,
    _matchType: 'keyword' as const,
  }))
}

async function searchBySemantics(supabase: any, query: string) {
  try {
    // Generate embedding for query
    const embedding = await generateEmbedding(query)
    if (!embedding) return []

    // Search by vector similarity
    const { data: matches, error } = await supabase.rpc('match_assets', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 50,
    })

    if (error) {
      // If the RPC doesn't exist, return empty results
      if (error.code === 'PGRST202') {
        return []
      }
      throw error
    }

    return (matches || []).map((item: any) => ({
      ...item,
      _matchType: 'semantic' as const,
      _similarity: item.similarity,
    }))
  } catch (error) {
    logError(error as Error)
    return []
  }
}

interface ScoredAsset {
  id: string
  filename: string
  ai_tags: string[]
  user_tags: string[]
  _matchType: 'keyword' | 'semantic'
  _similarity?: number
  _score?: number
  [key: string]: any
}

function combineAndRankResults(
  keywordResults: ScoredAsset[],
  semanticResults: ScoredAsset[],
  query: string
): ScoredAsset[] {
  const keywords = query.toLowerCase().split(/\s+/)
  const scoreMap = new Map<string, ScoredAsset>()

  // Score keyword results
  for (const result of keywordResults) {
    let score = 0
    const filenameLower = result.filename.toLowerCase()
    const queryLower = query.toLowerCase()

    // Exact filename match
    if (filenameLower === queryLower) {
      score += 100
    }
    // Partial filename match
    else if (filenameLower.includes(queryLower)) {
      score += 50
    }

    // Tag matches
    for (const keyword of keywords) {
      if (result.ai_tags?.some((t: string) => t.toLowerCase() === keyword)) {
        score += 30
      }
      if (result.user_tags?.some((t: string) => t.toLowerCase() === keyword)) {
        score += 30
      }
    }

    scoreMap.set(result.id, { ...result, _score: score })
  }

  // Score semantic results
  for (const result of semanticResults) {
    const existing = scoreMap.get(result.id)
    let score = existing?._score || 0

    // Add semantic score
    if (result._similarity && result._similarity > 0.8) {
      score += 20
    } else if (result._similarity && result._similarity > 0.6) {
      score += 10
    } else if (result._similarity && result._similarity > 0.5) {
      score += 5
    }

    if (existing) {
      scoreMap.set(result.id, { ...existing, _score: score })
    } else {
      scoreMap.set(result.id, { ...result, _score: score })
    }
  }

  // Sort by score (descending), then by created_at (descending)
  return Array.from(scoreMap.values()).sort((a, b) => {
    const scoreDiff = (b._score || 0) - (a._score || 0)
    if (scoreDiff !== 0) return scoreDiff
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}
