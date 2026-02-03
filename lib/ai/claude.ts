import Anthropic from '@anthropic-ai/sdk'

let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }

  return anthropicClient
}

interface TagsResponse {
  tags: string[]
}

export async function generateTags(content: string, fileType: 'image' | 'pdf'): Promise<string[]> {
  try {
    const anthropic = getAnthropicClient()
    if (!anthropic) {
      console.warn('Anthropic API key not configured, skipping tag generation')
      return []
    }

    const prompt = `Analyze this ${fileType === 'pdf' ? 'document' : 'image'} content and generate relevant tags for a marketing asset library.

Rules:
- Generate 3-7 tags
- Tags should be lowercase, single words or short phrases
- Include: subject matter, style, mood, colors (if distinctive), use case
- Be specific: "woman running" not just "person"
- Think about what someone might search for

Content: ${content.substring(0, 4000)}

Respond in JSON only:
{ "tags": ["tag1", "tag2", ...] }`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as TagsResponse
      return parsed.tags || []
    }

    return []
  } catch (error) {
    console.error('Error generating tags:', error)
    return []
  }
}

export async function generateSummary(content: string, fileType: 'image' | 'pdf'): Promise<string | null> {
  try {
    const anthropic = getAnthropicClient()
    if (!anthropic) {
      console.warn('Anthropic API key not configured, skipping summary generation')
      return null
    }

    const prompt = `Write a 1-2 sentence summary of this marketing asset. Be specific and descriptive.

Examples:
- "Product mockup showing the Superpower app dashboard on an iPhone 15 Pro, dark mode, with health metrics visible."
- "Lifestyle photo of a man in his 30s checking his smartwatch while jogging in an urban park, morning light."
- "PDF one-pager explaining the benefits of NAD+ supplementation, includes dosage chart."

Content: ${content.substring(0, 4000)}

Respond with just the summary, no JSON.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    return responseText.trim() || null
  } catch (error) {
    console.error('Error generating summary:', error)
    return null
  }
}

export async function analyzeImageContent(base64Image: string, mimeType: string): Promise<{
  description: string
  tags: string[]
  summary: string | null
}> {
  try {
    const anthropic = getAnthropicClient()
    if (!anthropic) {
      console.warn('Anthropic API key not configured, skipping image analysis')
      return { description: '', tags: [], summary: null }
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `Analyze this marketing asset image and provide:

1. A detailed description of what's in the image (2-4 sentences)
2. 3-7 relevant tags for a marketing asset library (lowercase, specific, searchable)
3. A 1-2 sentence TLDR summary suitable for quick browsing

Respond in this exact JSON format:
{
  "description": "...",
  "tags": ["tag1", "tag2", ...],
  "summary": "..."
}`,
            },
          ],
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        description: parsed.description || '',
        tags: parsed.tags || [],
        summary: parsed.summary || null,
      }
    }

    return { description: '', tags: [], summary: null }
  } catch (error) {
    console.error('Error analyzing image:', error)
    return { description: '', tags: [], summary: null }
  }
}
