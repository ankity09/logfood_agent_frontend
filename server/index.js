/**
 * Backend API Server for LogFoodAgent
 *
 * This server handles:
 * 1. Token generation for embedded dashboards
 * 2. Proxying chat requests to Databricks Model Serving endpoints
 *
 * Authentication:
 * - Uses "on behalf of user" auth via X-Forwarded-Access-Token header
 * - Databricks Apps automatically provides this header when the feature is enabled
 */

import express from 'express'
import cors from 'cors'
import { config, validateConfig, logConfig } from './config.js'
import lakebaseRoutes from './lakebase.js'

const app = express()
const PORT = config.server.port

// Middleware
app.use(cors())
app.use(express.json())

// Serve static files from dist folder
app.use(express.static('dist'))

// Log configuration on startup
logConfig()
validateConfig()

/**
 * Extract user token from request headers
 * Databricks Apps provides the user's access token via X-Forwarded-Access-Token
 */
function getUserToken(req) {
  // Primary: On-behalf-of-user token from Databricks Apps
  const forwardedToken = req.headers['x-forwarded-access-token']
  if (forwardedToken) {
    return forwardedToken
  }

  // Fallback: Authorization header (for local development)
  const authHeader = req.headers['authorization']
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Fallback: Environment variable (for local development)
  return config.databricks.token || null
}

/**
 * Extract user email from request headers
 */
function getUserEmail(req) {
  return req.headers['x-forwarded-email'] || 'unknown'
}

/**
 * Service Principal Token Cache
 * Caches the token with expiry to avoid unnecessary token refreshes
 */
let spTokenCache = {
  token: null,
  expiresAt: 0,
}

/**
 * Get a token for the app's service principal using OAuth client credentials flow.
 * This is used for Model Serving calls since on-behalf-of-user tokens may not have
 * the required scopes for querying serving endpoints.
 *
 * Databricks Apps automatically inject:
 * - DATABRICKS_CLIENT_ID
 * - DATABRICKS_CLIENT_SECRET
 * - DATABRICKS_HOST
 */
async function getServicePrincipalToken() {
  // Return cached token if still valid (with 60s buffer)
  if (spTokenCache.token && Date.now() < spTokenCache.expiresAt - 60000) {
    return spTokenCache.token
  }

  const clientId = process.env.DATABRICKS_CLIENT_ID
  const clientSecret = process.env.DATABRICKS_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.log('Service principal credentials not available (DATABRICKS_CLIENT_ID/SECRET)')
    return null
  }

  try {
    const tokenUrl = `${config.databricks.instanceUrl}/oidc/v1/token`

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'all-apis',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to get service principal token:', errorText)
      return null
    }

    const data = await response.json()
    spTokenCache.token = data.access_token
    // Token typically valid for 1 hour
    spTokenCache.expiresAt = Date.now() + (data.expires_in || 3600) * 1000

    console.log('Service principal token obtained successfully')
    return spTokenCache.token
  } catch (error) {
    console.error('Error getting service principal token:', error.message)
    return null
  }
}

/**
 * Get the best available token for Model Serving calls.
 * Prefers service principal token (more reliable scopes), falls back to user token.
 */
async function getModelServingToken(req) {
  // Try service principal token first (has proper scopes for serving endpoints)
  const spToken = await getServicePrincipalToken()
  if (spToken) {
    return { token: spToken, source: 'service-principal' }
  }

  // Fallback to user token
  const userToken = getUserToken(req)
  if (userToken) {
    return { token: userToken, source: 'user' }
  }

  return { token: null, source: null }
}

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  const userToken = getUserToken(req)
  const userEmail = getUserEmail(req)

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    userAuthenticated: !!userToken,
    userEmail: userEmail,
    endpoint: config.databricks.chatEndpoint,
    isDatabricksApp: config.databricks.isDatabricksApp,
  })
})

/**
 * Generate token for dashboard embedding
 *
 * Uses the user's forwarded access token from Databricks Apps
 */
app.post('/api/auth/dashboard-token', async (req, res) => {
  try {
    const { dashboardId } = req.body

    if (!dashboardId) {
      return res.status(400).json({ error: 'Dashboard ID is required' })
    }

    // Get user's access token from Databricks Apps headers
    const token = getUserToken(req)
    const userEmail = getUserEmail(req)

    if (!token) {
      console.error(`Dashboard token request failed for user ${userEmail}: No access token available`)
      return res.status(401).json({
        error: 'Not authenticated',
        hint: 'Ensure you are accessing this app through Databricks Apps with on-behalf-of-user auth enabled',
      })
    }

    console.log(`Dashboard token provided for user: ${userEmail}, dashboard: ${dashboardId}`)

    res.json({
      token,
      expiresIn: 3600, // Token expiry managed by Databricks
      dashboardId,
      userEmail,
    })
  } catch (error) {
    console.error('Token generation error:', error)
    res.status(500).json({ error: 'Failed to generate token' })
  }
})

/**
 * Chat endpoint - proxy to Databricks Model Serving
 *
 * Uses service principal token for Model Serving (better scope handling)
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    const userEmail = getUserEmail(req)

    // Get token for Model Serving (prefers service principal)
    const { token, source } = await getModelServingToken(req)

    if (!token) {
      console.error(`Chat request failed for user ${userEmail}: No access token available`)
      return res.status(401).json({
        error: 'Not authenticated',
        hint: 'Ensure you are accessing this app through Databricks Apps with on-behalf-of-user auth enabled',
      })
    }

    const endpointUrl = `${config.databricks.instanceUrl}/serving-endpoints/${config.databricks.chatEndpoint}/invocations`

    console.log(`Chat request from user: ${userEmail}`)
    console.log(`Endpoint: ${endpointUrl}`)
    console.log(`Token source: ${source}`)
    console.log(`Messages count: ${messages.length}`)

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages,
        max_tokens: config.chat.maxTokens,
        temperature: config.chat.temperature,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Databricks API error (${response.status}) for user ${userEmail}:`, errorText)
      return res.status(response.status).json({
        error: 'Failed to get response from AI',
        status: response.status,
        details: errorText,
      })
    }

    const data = await response.json()

    // Extract the assistant's message from the response
    // Handle different response formats from Databricks endpoints
    let assistantMessage = 'I received your message but could not generate a response.'

    if (data.choices && data.choices[0]?.message?.content) {
      // OpenAI-compatible format
      assistantMessage = data.choices[0].message.content
    } else if (data.output) {
      // Direct output format
      assistantMessage = data.output
    } else if (data.predictions && data.predictions[0]) {
      // MLflow predictions format
      assistantMessage = typeof data.predictions[0] === 'string'
        ? data.predictions[0]
        : JSON.stringify(data.predictions[0])
    } else if (typeof data === 'string') {
      assistantMessage = data
    }

    console.log(`Chat response for user ${userEmail}, length: ${assistantMessage.length}`)

    res.json({
      message: assistantMessage,
      usage: data.usage || null,
    })
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({
      error: 'Failed to process chat request',
      details: error.message,
    })
  }
})

/**
 * Streaming chat endpoint
 *
 * Uses service principal token for Model Serving (better scope handling)
 */
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { messages } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    const userEmail = getUserEmail(req)

    // Get token for Model Serving (prefers service principal)
    const { token, source } = await getModelServingToken(req)

    if (!token) {
      return res.status(401).json({
        error: 'Not authenticated',
        hint: 'Ensure on-behalf-of-user auth is enabled or service principal is configured',
      })
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const endpointUrl = `${config.databricks.instanceUrl}/serving-endpoints/${config.databricks.chatEndpoint}/invocations`

    console.log(`Streaming chat request from user: ${userEmail}`)
    console.log(`Token source: ${source}`)

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages,
        max_tokens: config.chat.maxTokens,
        temperature: config.chat.temperature,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      res.write(`data: ${JSON.stringify({ error: errorText })}\n\n`)
      res.end()
      return
    }

    // Stream the response
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error) {
    console.error('Streaming chat error:', error)
    res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
    res.end()
  }
})

/**
 * Generate Salesforce update from raw notes + use case context
 *
 * Uses service principal token for Model Serving (better scope handling)
 */
app.post('/api/generate-update', async (req, res) => {
  try {
    const { rawNotes, useCaseContext } = req.body

    if (!rawNotes) {
      return res.status(400).json({ error: 'rawNotes is required' })
    }

    const userEmail = getUserEmail(req)

    // Get token for Model Serving (prefers service principal)
    const { token, source } = await getModelServingToken(req)

    if (!token) {
      return res.status(401).json({
        error: 'Not authenticated',
        hint: 'Ensure on-behalf-of-user auth is enabled or service principal is configured',
      })
    }

    const ctx = useCaseContext || {}
    const contextBlock = [
      `Use Case: ${ctx.title || 'N/A'}`,
      `Account: ${ctx.account || 'N/A'}`,
      `Stage: ${ctx.stage || 'N/A'}`,
      `Value: ${ctx.value || 'N/A'}`,
      `Owner: ${ctx.owner || 'N/A'}`,
      ctx.stakeholders?.length ? `Stakeholders: ${ctx.stakeholders.join(', ')}` : '',
      ctx.databricksServices?.length ? `Databricks Services: ${ctx.databricksServices.join(', ')}` : '',
      ctx.goLiveDate ? `Target Go-Live: ${ctx.goLiveDate}` : '',
      ctx.description ? `\nDescription:\n${ctx.description}` : '',
      ctx.nextSteps?.length ? `\nRecent Updates:\n${ctx.nextSteps.slice(0, 10).join('\n')}` : '',
    ].filter(Boolean).join('\n')

    const systemPrompt = `You are a Salesforce CRM update assistant for Databricks Solutions Architects. Your job is to take raw meeting notes or observations and produce a concise, professional "Next Steps" update entry suitable for pasting into Salesforce.

Format the output as a single entry in this exact format:
[MM/DD/YY] [INITIALS] - [Concise update summarizing key points, decisions, and next actions]

Rules:
- Use today's date in MM/DD/YY format
- Use the initials from the user's email or "SA" if unknown
- Keep it concise but include all important details: decisions made, blockers, next actions, timeline changes
- Use professional but direct language
- Do not include headers, bullet points, or multiple paragraphs — it should be a single continuous entry
- Reference specific people, dates, and action items from the notes
- If the notes mention a next meeting or deadline, include it

The user's email is: ${userEmail}`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here is the use case context:\n\n${contextBlock}\n\nHere are my raw notes:\n\n${rawNotes}\n\nPlease generate a Salesforce Next Steps update entry.` },
    ]

    const endpointUrl = `${config.databricks.instanceUrl}/serving-endpoints/${config.databricks.chatEndpoint}/invocations`

    console.log(`Generate update request from user: ${userEmail}`)
    console.log(`Token source: ${source}`)

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages,
        max_tokens: config.chat.maxTokens,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Generate update API error (${response.status}):`, errorText)
      return res.status(response.status).json({
        error: 'Failed to generate update',
        details: errorText,
      })
    }

    const data = await response.json()

    let update = ''
    if (data.choices && data.choices[0]?.message?.content) {
      update = data.choices[0].message.content
    } else if (data.output) {
      update = data.output
    } else if (data.predictions && data.predictions[0]) {
      update = typeof data.predictions[0] === 'string' ? data.predictions[0] : JSON.stringify(data.predictions[0])
    } else if (typeof data === 'string') {
      update = data
    }

    console.log(`Generate update response for user ${userEmail}, length: ${update.length}`)

    res.json({ update })
  } catch (error) {
    console.error('Generate update error:', error)
    res.status(500).json({
      error: 'Failed to generate update',
      details: error.message,
    })
  }
})

/**
 * User info endpoint - returns current user information
 */
app.get('/api/user', (req, res) => {
  const token = getUserToken(req)
  const userEmail = getUserEmail(req)

  res.json({
    authenticated: !!token,
    email: userEmail,
    // Additional headers that Databricks Apps might provide
    forwardedUser: req.headers['x-forwarded-user'] || null,
    forwardedGroups: req.headers['x-forwarded-groups'] || null,
  })
})

// Attach user token to request for Lakebase routes
app.use('/api', (req, res, next) => {
  req.userToken = getUserToken(req)
  next()
})

// Mount Lakebase data routes
app.use('/api', lakebaseRoutes)

// Catch-all route to serve the frontend for client-side routing
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'dist' })
})

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nServer running on http://0.0.0.0:${PORT}`)
  console.log(`\nAuthentication: On-behalf-of-user (X-Forwarded-Access-Token)`)
  console.log(`\nAPI Endpoints:`)
  console.log(`  GET  /api/health               - Health check`)
  console.log(`  GET  /api/user                 - Current user info`)
  console.log(`  POST /api/auth/dashboard-token - Get dashboard token`)
  console.log(`  POST /api/chat                 - Chat with AI`)
  console.log(`  POST /api/chat/stream          - Streaming chat`)
  console.log(`  GET  /api/use-cases            - List use cases`)
  console.log(`  GET  /api/use-cases/:id        - Get use case`)
  console.log(`  POST /api/use-cases            - Create use case`)
  console.log(`  PATCH /api/use-cases/:id       - Update use case`)
  console.log(`  GET  /api/accounts             - List accounts`)
  console.log(`  GET  /api/meeting-notes        - List meeting notes`)
  console.log(`  POST /api/meeting-notes        - Create meeting note`)
  console.log(`  GET  /api/activities            - Recent activities`)
  console.log(`  GET  /api/stats                - Dashboard stats`)
})
