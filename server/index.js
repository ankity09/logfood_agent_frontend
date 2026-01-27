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
 * Uses the user's access token for authentication
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    // Get user's access token
    const token = getUserToken(req)
    const userEmail = getUserEmail(req)

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
 * For real-time streaming responses from the AI model.
 */
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { messages } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    const token = getUserToken(req)
    const userEmail = getUserEmail(req)

    if (!token) {
      return res.status(401).json({
        error: 'Not authenticated',
        hint: 'Ensure on-behalf-of-user auth is enabled',
      })
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const endpointUrl = `${config.databricks.instanceUrl}/serving-endpoints/${config.databricks.chatEndpoint}/invocations`

    console.log(`Streaming chat request from user: ${userEmail}`)

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
