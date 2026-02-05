/**
 * Embedding Service
 *
 * Generates embeddings using Databricks GTE endpoint
 */

import { config } from '../config.js'

// Default embedding endpoint (GTE-large produces 1024 dimensions)
const DEFAULT_EMBEDDING_ENDPOINT = 'databricks-gte-large-en'

/**
 * Token cache for service principal
 */
let spTokenCache = { token: null, expiresAt: 0 }

/**
 * Get service principal token
 */
async function getServicePrincipalToken() {
  if (spTokenCache.token && Date.now() < spTokenCache.expiresAt - 60000) {
    return spTokenCache.token
  }

  const clientId = process.env.DATABRICKS_CLIENT_ID
  const clientSecret = process.env.DATABRICKS_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return null
  }

  try {
    const tokenUrl = `${config.databricks.instanceUrl}/oidc/v1/token`
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'all-apis',
      }),
    })

    if (response.ok) {
      const data = await response.json()
      spTokenCache.token = data.access_token
      spTokenCache.expiresAt = Date.now() + (data.expires_in || 3600) * 1000
      return spTokenCache.token
    }
  } catch (error) {
    console.error('Error getting service principal token for embedding:', error.message)
  }

  return null
}

/**
 * Generate embedding for text
 *
 * @param {string} text - Text to embed
 * @param {string} userToken - Optional user token (falls back to service principal)
 * @returns {number[]|null} - 1024-dimensional embedding vector or null on error
 */
export async function generateEmbedding(text, userToken = null) {
  if (!text || text.trim().length === 0) {
    return null
  }

  // Truncate text if too long (most embedding models have limits)
  const maxLength = 8000
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text

  try {
    // Get token
    const spToken = await getServicePrincipalToken()
    const token = spToken || userToken || config.databricks.token

    if (!token) {
      console.error('No token available for embedding generation')
      return null
    }

    const embeddingEndpoint = process.env.DATABRICKS_EMBEDDING_ENDPOINT || DEFAULT_EMBEDDING_ENDPOINT
    const endpointUrl = `${config.databricks.instanceUrl}/serving-endpoints/${embeddingEndpoint}/invocations`

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        input: truncatedText,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Embedding API error (${response.status}):`, errorText)
      return null
    }

    const data = await response.json()

    // Extract embedding from response
    // GTE endpoint returns: { data: [{ embedding: [...] }] }
    if (data.data && data.data[0]?.embedding) {
      return data.data[0].embedding
    }

    // Alternative formats
    if (data.embedding) {
      return data.embedding
    }

    if (data.embeddings && data.embeddings[0]) {
      return data.embeddings[0]
    }

    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      return data[0]
    }

    console.error('Could not extract embedding from response:', JSON.stringify(data).substring(0, 200))
    return null
  } catch (error) {
    console.error('Error generating embedding:', error.message)
    return null
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 *
 * @param {string[]} texts - Array of texts to embed
 * @param {string} userToken - Optional user token
 * @returns {(number[]|null)[]} - Array of embeddings (null for failed items)
 */
export async function generateEmbeddings(texts, userToken = null) {
  if (!texts || texts.length === 0) {
    return []
  }

  // For now, process sequentially to avoid rate limits
  // Could be optimized with batch endpoint if available
  const results = []

  for (const text of texts) {
    const embedding = await generateEmbedding(text, userToken)
    results.push(embedding)

    // Small delay between requests to avoid rate limiting
    if (texts.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return results
}

/**
 * Check if embedding service is available
 */
export async function checkEmbeddingService() {
  try {
    const testEmbedding = await generateEmbedding('test')
    return {
      available: testEmbedding !== null,
      dimensions: testEmbedding?.length || 0,
    }
  } catch (error) {
    return {
      available: false,
      error: error.message,
    }
  }
}
