import OpenAI from 'openai'

let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  return openaiClient
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    if (!text || text.trim().length === 0) {
      return null
    }

    const openai = getOpenAIClient()
    if (!openai) {
      console.warn('OpenAI API key not configured, skipping embedding generation')
      return null
    }

    // Truncate text to fit model limits
    const truncatedText = text.substring(0, 8000)

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: truncatedText,
    })

    return response.data[0]?.embedding || null
  } catch (error) {
    console.error('Error generating embedding:', error)
    return null
  }
}
