/**
 * Lakebase Postgres routes
 *
 * Connects to Lakebase via Postgres wire protocol (pg driver).
 * Uses the user's OAuth token as the Postgres password.
 * This bypasses the Data API's PostgREST authenticator role chain.
 */

import express from 'express'
import pg from 'pg'
import { config } from './config.js'

const router = express.Router()

/**
 * Helper: run a query by creating a fresh pg.Client with the user's OAuth token.
 * Each request gets its own connection to avoid token/session conflicts.
 * Lakebase Autoscaling accepts Databricks OAuth tokens as Postgres passwords.
 */
async function query(token, text, params = []) {
  const client = new pg.Client({
    host: config.lakebase.pgHost,
    port: config.lakebase.pgPort,
    database: config.lakebase.pgDatabase,
    user: config.lakebase.pgUser,
    password: token,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  })

  try {
    await client.connect()
    const result = await client.query(text, params)
    return result.rows
  } finally {
    await client.end().catch((err) => {
      console.error('Error closing Lakebase client:', err.message)
    })
  }
}

// -------------------------------------------------------------------
// USE CASES
// -------------------------------------------------------------------

/**
 * GET /api/use-cases
 * Query params: stage, service, date, search
 */
router.get('/use-cases', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) {
      console.error('GET /api/use-cases: No user token found in request')
      return res.status(401).json({ error: 'Not authenticated' })
    }
    const conditions = []
    const params = []
    let paramIdx = 1

    if (req.query.stage && req.query.stage !== 'all') {
      conditions.push(`uc.stage = $${paramIdx++}`)
      params.push(req.query.stage)
    }
    if (req.query.service && req.query.service !== 'all') {
      conditions.push(`$${paramIdx++} = ANY(uc.databricks_services)`)
      params.push(req.query.service)
    }
    if (req.query.search) {
      conditions.push(`(uc.title ILIKE $${paramIdx} OR uc.description ILIKE $${paramIdx})`)
      params.push(`%${req.query.search}%`)
      paramIdx++
    }
    if (req.query.date && req.query.date !== 'all') {
      const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
      const days = daysMap[req.query.date]
      if (days) {
        conditions.push(`uc.created_at >= NOW() - INTERVAL '${days} days'`)
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const sql = `
      SELECT
        uc.id, uc.title, uc.description, uc.stage, uc.value_cents,
        uc.databricks_services, uc.next_steps, uc.stakeholders,
        uc.go_live_date, uc.created_at, uc.updated_at,
        a.id AS account_id, a.name AS account_name,
        u.id AS owner_id, u.name AS owner_name
      FROM use_cases uc
      LEFT JOIN accounts a ON uc.account_id = a.id
      LEFT JOIN users u ON uc.owner_id = u.id
      ${where}
      ORDER BY uc.created_at DESC
    `

    const rows = await query(token, sql, params)
    console.log(`GET /api/use-cases: query returned ${rows.length} rows`)
    const useCases = rows.map(transformUseCase)
    res.json(useCases)
  } catch (error) {
    console.error('GET /api/use-cases error:', error.message, error.stack)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/use-cases/:id
 */
router.get('/use-cases/:id', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const sql = `
      SELECT
        uc.id, uc.title, uc.description, uc.stage, uc.value_cents,
        uc.databricks_services, uc.next_steps, uc.stakeholders,
        uc.go_live_date, uc.created_at, uc.updated_at,
        a.id AS account_id, a.name AS account_name,
        u.id AS owner_id, u.name AS owner_name
      FROM use_cases uc
      LEFT JOIN accounts a ON uc.account_id = a.id
      LEFT JOIN users u ON uc.owner_id = u.id
      WHERE uc.id = $1
    `

    const rows = await query(token, sql, [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json(transformUseCase(rows[0]))
  } catch (error) {
    console.error('GET /api/use-cases/:id error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/use-cases
 */
router.post('/use-cases', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const {
      title, description, account_id, owner_id, stage,
      value_cents, databricks_services, next_steps, stakeholders, go_live_date,
    } = req.body

    const sql = `
      INSERT INTO use_cases (title, description, account_id, owner_id, stage, value_cents, databricks_services, next_steps, stakeholders, go_live_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `

    const rows = await query(token, sql, [
      title, description, account_id, owner_id, stage || 'validating',
      value_cents || 0, databricks_services || [], next_steps || [], stakeholders || [],
      go_live_date || null,
    ])

    res.status(201).json(rows[0])
  } catch (error) {
    console.error('POST /api/use-cases error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * PATCH /api/use-cases/:id
 */
router.patch('/use-cases/:id', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    // Build SET clause dynamically from provided fields
    const allowed = [
      'title', 'description', 'stage', 'value_cents',
      'databricks_services', 'next_steps', 'stakeholders',
      'account_id', 'owner_id', 'go_live_date',
    ]
    const sets = []
    const params = []
    let idx = 1

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = $${idx++}`)
        params.push(req.body[field])
      }
    }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' })

    sets.push(`updated_at = NOW()`)
    params.push(req.params.id)

    const sql = `UPDATE use_cases SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`
    const rows = await query(token, sql, params)
    res.json(rows[0])
  } catch (error) {
    console.error('PATCH /api/use-cases/:id error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// -------------------------------------------------------------------
// ACCOUNTS
// -------------------------------------------------------------------

router.get('/accounts', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const rows = await query(token, 'SELECT * FROM accounts ORDER BY name ASC')
    res.json(rows)
  } catch (error) {
    console.error('GET /api/accounts error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

router.post('/accounts', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const { name, industry } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Account name is required' })
    }

    const sql = `
      INSERT INTO accounts (name, industry)
      VALUES ($1, $2)
      RETURNING *
    `

    const rows = await query(token, sql, [name.trim(), industry || null])
    res.status(201).json(rows[0])
  } catch (error) {
    // Handle duplicate account name gracefully
    if (error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
      // Try to return the existing account
      try {
        const existing = await query(req.userToken, 'SELECT * FROM accounts WHERE LOWER(name) = LOWER($1)', [req.body.name.trim()])
        if (existing.length > 0) {
          return res.json(existing[0])
        }
      } catch (e) {
        // Ignore and return original error
      }
    }
    console.error('POST /api/accounts error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// -------------------------------------------------------------------
// MEETING NOTES
// -------------------------------------------------------------------

router.get('/meeting-notes', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const sql = `
      SELECT
        mn.id, mn.filename, mn.summary, mn.attendees, mn.uploaded_at,
        a.id AS account_id, a.name AS account_name
      FROM meeting_notes mn
      LEFT JOIN accounts a ON mn.account_id = a.id
      ORDER BY mn.uploaded_at DESC
    `

    const noteRows = await query(token, sql)

    // Fetch extracted use cases for all meeting notes
    const noteIds = noteRows.map((n) => n.id)
    let eucRows = []
    if (noteIds.length > 0) {
      eucRows = await query(
        token,
        `SELECT * FROM extracted_use_cases WHERE meeting_note_id = ANY($1) ORDER BY created_at`,
        [noteIds]
      )
    }

    // Group extracted use cases by meeting_note_id
    const eucByNote = {}
    for (const euc of eucRows) {
      if (!eucByNote[euc.meeting_note_id]) eucByNote[euc.meeting_note_id] = []
      eucByNote[euc.meeting_note_id].push(euc)
    }

    const notes = noteRows.map((row) => transformMeetingNote(row, eucByNote[row.id] || []))
    res.json(notes)
  } catch (error) {
    console.error('GET /api/meeting-notes error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

router.post('/meeting-notes', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const { filename, account_id, summary, attendees } = req.body

    const sql = `
      INSERT INTO meeting_notes (filename, account_id, summary, attendees)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `

    const rows = await query(token, sql, [filename, account_id, summary, attendees || []])
    res.status(201).json(rows[0])
  } catch (error) {
    console.error('POST /api/meeting-notes error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// -------------------------------------------------------------------
// EXTRACTED USE CASES
// -------------------------------------------------------------------

router.post('/extracted-use-cases', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const { meeting_note_id, title, description, suggested_stage, next_steps, linked_use_case_id } = req.body

    const sql = `
      INSERT INTO extracted_use_cases (meeting_note_id, title, description, suggested_stage, next_steps, linked_use_case_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `

    const rows = await query(token, sql, [
      meeting_note_id, title, description, suggested_stage, next_steps || [], linked_use_case_id || null,
    ])

    res.status(201).json(rows[0])
  } catch (error) {
    console.error('POST /api/extracted-use-cases error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// -------------------------------------------------------------------
// ACTIVITIES
// -------------------------------------------------------------------

router.get('/activities', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const limit = parseInt(req.query.limit, 10) || 10

    const sql = `
      SELECT
        act.id, act.type, act.description, act.created_at,
        a.id AS account_id, a.name AS account_name
      FROM activities act
      LEFT JOIN accounts a ON act.account_id = a.id
      ORDER BY act.created_at DESC
      LIMIT $1
    `

    const rows = await query(token, sql, [limit])

    // Shape to match what the frontend expects (nested accounts object)
    const activities = rows.map((row) => ({
      id: row.id,
      type: row.type,
      description: row.description,
      created_at: row.created_at,
      accounts: row.account_id ? { id: row.account_id, name: row.account_name } : null,
    }))

    res.json(activities)
  } catch (error) {
    console.error('GET /api/activities error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

router.post('/activities', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const { type, description, account_id, use_case_id, meeting_note_id } = req.body

    const sql = `
      INSERT INTO activities (type, description, account_id, use_case_id, meeting_note_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `

    const rows = await query(token, sql, [
      type, description, account_id || null, use_case_id || null, meeting_note_id || null,
    ])

    res.status(201).json(rows[0])
  } catch (error) {
    console.error('POST /api/activities error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// -------------------------------------------------------------------
// STATS (aggregated for Overview dashboard)
// -------------------------------------------------------------------

router.get('/stats', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    // Run aggregation queries in parallel
    const [stageRows, accountRows, meetingRows] = await Promise.all([
      query(token, 'SELECT stage, COUNT(*)::int AS count FROM use_cases GROUP BY stage'),
      query(token, 'SELECT COUNT(*)::int AS count FROM accounts'),
      query(token, `SELECT COUNT(*)::int AS count FROM meeting_notes WHERE uploaded_at >= date_trunc('month', CURRENT_DATE)`),
    ])

    // Build stage counts
    const stageCounts = {}
    let totalUseCases = 0
    for (const row of stageRows) {
      stageCounts[row.stage] = row.count
      totalUseCases += row.count
    }

    const liveCount = stageCounts['live'] || 0
    const conversionRate = totalUseCases > 0 ? Math.round((liveCount / totalUseCases) * 100) : 0

    res.json({
      totalUseCases,
      totalAccounts: accountRows[0]?.count || 0,
      meetingsThisMonth: meetingRows[0]?.count || 0,
      conversionRate,
      stageCounts,
    })
  } catch (error) {
    console.error('GET /api/stats error:', error.message, error.stack)
    res.status(500).json({ error: error.message })
  }
})

// -------------------------------------------------------------------
// CHAT SESSIONS
// -------------------------------------------------------------------

/**
 * GET /api/chat-sessions
 * List user's chat sessions (most recent first, max 30)
 */
router.get('/chat-sessions', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const userEmail = req.headers['x-forwarded-email'] || 'unknown'

    const sql = `
      SELECT id, title, created_at, updated_at
      FROM chat_sessions
      WHERE user_email = $1
      ORDER BY updated_at DESC
      LIMIT 30
    `

    const rows = await query(token, sql, [userEmail])
    res.json(rows)
  } catch (error) {
    console.error('GET /api/chat-sessions error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/chat-sessions
 * Create a new chat session
 */
router.post('/chat-sessions', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const userEmail = req.headers['x-forwarded-email'] || 'unknown'
    const { title } = req.body

    const sql = `
      INSERT INTO chat_sessions (user_email, title)
      VALUES ($1, $2)
      RETURNING id, user_email, title, created_at, updated_at
    `

    const rows = await query(token, sql, [userEmail, title || 'New conversation'])

    // Cleanup old sessions (keep only last 30)
    try {
      await query(token, 'SELECT cleanup_old_chat_sessions($1, 30)', [userEmail])
    } catch (cleanupErr) {
      console.warn('Session cleanup warning:', cleanupErr.message)
    }

    res.status(201).json(rows[0])
  } catch (error) {
    console.error('POST /api/chat-sessions error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/chat-sessions/:id
 * Get a single session with all its messages
 */
router.get('/chat-sessions/:id', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const userEmail = req.headers['x-forwarded-email'] || 'unknown'

    // Get session (verify ownership)
    const sessionSql = `
      SELECT id, user_email, title, created_at, updated_at
      FROM chat_sessions
      WHERE id = $1 AND user_email = $2
    `
    const sessionRows = await query(token, sessionSql, [req.params.id, userEmail])

    if (sessionRows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Get messages
    const messagesSql = `
      SELECT id, role, content, status, created_at
      FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
    `
    const messageRows = await query(token, messagesSql, [req.params.id])

    res.json({
      ...sessionRows[0],
      messages: messageRows,
    })
  } catch (error) {
    console.error('GET /api/chat-sessions/:id error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * PATCH /api/chat-sessions/:id
 * Update session title
 */
router.patch('/chat-sessions/:id', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const userEmail = req.headers['x-forwarded-email'] || 'unknown'
    const { title } = req.body

    if (!title) {
      return res.status(400).json({ error: 'Title is required' })
    }

    const sql = `
      UPDATE chat_sessions
      SET title = $1, updated_at = NOW()
      WHERE id = $2 AND user_email = $3
      RETURNING id, user_email, title, created_at, updated_at
    `

    const rows = await query(token, sql, [title, req.params.id, userEmail])

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json(rows[0])
  } catch (error) {
    console.error('PATCH /api/chat-sessions/:id error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * DELETE /api/chat-sessions/:id
 * Delete a chat session and all its messages
 */
router.delete('/chat-sessions/:id', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const userEmail = req.headers['x-forwarded-email'] || 'unknown'

    const sql = `
      DELETE FROM chat_sessions
      WHERE id = $1 AND user_email = $2
      RETURNING id
    `

    const rows = await query(token, sql, [req.params.id, userEmail])

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json({ success: true, deletedId: rows[0].id })
  } catch (error) {
    console.error('DELETE /api/chat-sessions/:id error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/chat-sessions/:id/messages
 * Add a user message to a session
 * (Assistant messages are added after AI response)
 */
router.post('/chat-sessions/:id/messages', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const userEmail = req.headers['x-forwarded-email'] || 'unknown'
    const { role, content, status } = req.body

    if (!role || !content) {
      return res.status(400).json({ error: 'role and content are required' })
    }

    // Verify session ownership
    const sessionCheck = await query(
      token,
      'SELECT id FROM chat_sessions WHERE id = $1 AND user_email = $2',
      [req.params.id, userEmail]
    )

    if (sessionCheck.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const sql = `
      INSERT INTO chat_messages (session_id, role, content, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, session_id, role, content, status, created_at
    `

    const rows = await query(token, sql, [
      req.params.id,
      role,
      content,
      status || 'completed',
    ])

    res.status(201).json(rows[0])
  } catch (error) {
    console.error('POST /api/chat-sessions/:id/messages error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/chat-sessions/:id/chat
 * Send a message and get AI response (processes in background)
 * Returns immediately with message IDs, AI processes asynchronously
 */
router.post('/chat-sessions/:id/chat', async (req, res) => {
  const token = req.userToken
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  const userEmail = req.headers['x-forwarded-email'] || 'unknown'
  const { content } = req.body

  if (!content) {
    return res.status(400).json({ error: 'content is required' })
  }

  try {
    // Verify session ownership
    const sessionCheck = await query(
      token,
      'SELECT id, title FROM chat_sessions WHERE id = $1 AND user_email = $2',
      [req.params.id, userEmail]
    )

    if (sessionCheck.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Save user message
    const userMsgResult = await query(token, `
      INSERT INTO chat_messages (session_id, role, content, status)
      VALUES ($1, 'user', $2, 'completed')
      RETURNING id, session_id, role, content, status, created_at
    `, [req.params.id, content])

    const userMessage = userMsgResult[0]

    // Create placeholder for assistant response (processing status)
    const assistantMsgResult = await query(token, `
      INSERT INTO chat_messages (session_id, role, content, status)
      VALUES ($1, 'assistant', '', 'processing')
      RETURNING id, session_id, role, content, status, created_at
    `, [req.params.id])

    const assistantMessage = assistantMsgResult[0]

    // Return immediately with message IDs
    res.status(202).json({
      userMessage,
      assistantMessage,
      status: 'processing',
    })

    // Process AI response in background (don't await)
    processAIResponse(token, req.params.id, assistantMessage.id, userEmail).catch(err => {
      console.error('Background AI processing error:', err)
    })

  } catch (error) {
    console.error('POST /api/chat-sessions/:id/chat error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Background AI processing function
 * Called after returning response to client
 */
async function processAIResponse(token, sessionId, assistantMessageId, userEmail) {
  try {
    // Get all messages in session for context
    const messagesResult = await query(token, `
      SELECT role, content FROM chat_messages
      WHERE session_id = $1 AND status = 'completed'
      ORDER BY created_at ASC
    `, [sessionId])

    const chatHistory = messagesResult
      .filter(m => m.role !== 'error')
      .map(m => ({ role: m.role, content: m.content }))

    // Import config dynamically (we're in a module)
    const { config } = await import('./config.js')

    // Get service principal token for AI call
    const spToken = await getServicePrincipalTokenForBackground()
    const aiToken = spToken || token

    // Call AI endpoint
    const endpointUrl = `${config.databricks.instanceUrl}/serving-endpoints/${config.databricks.agentEndpoint}/invocations`

    const agentPayload = {
      input: chatHistory,
      max_output_tokens: config.chat.agentMaxTokens,
      temperature: config.chat.temperature,
      context: { user_id: userEmail },
    }

    console.log(`[Background] Processing AI for session ${sessionId}, message ${assistantMessageId}`)

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiToken}`,
      },
      body: JSON.stringify(agentPayload),
    })

    let assistantContent = 'I encountered an error processing your request.'
    let finalStatus = 'failed'

    if (response.ok) {
      let data = await response.json()

      // Parse response (same logic as /api/chat)
      if (typeof data === 'string') {
        try { data = JSON.parse(data) } catch (e) { /* ignore */ }
      }

      if (!Array.isArray(data) && data && typeof data === 'object') {
        if (Array.isArray(data.output)) data = data.output
        else if (Array.isArray(data.messages)) data = data.messages
        else if (Array.isArray(data.result)) data = data.result
      }

      if (Array.isArray(data)) {
        const assistantMessages = data.filter(
          item => item.type === 'message' && item.role === 'assistant'
        )
        const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]

        if (lastAssistantMessage?.content) {
          const textContent = lastAssistantMessage.content
            .filter(c => c.type === 'output_text' || c.type === 'text')
            .map(c => c.text)
            .join('\n\n')

          if (textContent) {
            assistantContent = textContent
            finalStatus = 'completed'
          }
        }
      } else if (data.choices?.[0]?.message?.content) {
        assistantContent = data.choices[0].message.content
        finalStatus = 'completed'
      } else if (data.output) {
        assistantContent = typeof data.output === 'string' ? data.output : JSON.stringify(data.output)
        finalStatus = 'completed'
      }
    } else {
      const errorText = await response.text()
      console.error(`[Background] AI API error (${response.status}):`, errorText)
      assistantContent = 'I apologize, but I encountered an error connecting to the AI service. Please try again.'
      finalStatus = 'failed'
    }

    // Update the assistant message with the response
    await query(token, `
      UPDATE chat_messages
      SET content = $1, status = $2
      WHERE id = $3
    `, [assistantContent, finalStatus, assistantMessageId])

    console.log(`[Background] Completed AI processing for message ${assistantMessageId}, status: ${finalStatus}`)

  } catch (error) {
    console.error('[Background] AI processing error:', error)

    // Update message to failed status
    try {
      await query(token, `
        UPDATE chat_messages
        SET content = $1, status = 'failed'
        WHERE id = $2
      `, ['I encountered an error processing your request. Please try again.', assistantMessageId])
    } catch (updateError) {
      console.error('[Background] Failed to update message status:', updateError)
    }
  }
}

/**
 * Get service principal token for background processing
 * Simplified version that reuses the cached token
 */
let bgSpTokenCache = { token: null, expiresAt: 0 }

async function getServicePrincipalTokenForBackground() {
  if (bgSpTokenCache.token && Date.now() < bgSpTokenCache.expiresAt - 60000) {
    return bgSpTokenCache.token
  }

  const clientId = process.env.DATABRICKS_CLIENT_ID
  const clientSecret = process.env.DATABRICKS_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return null
  }

  try {
    const { config } = await import('./config.js')
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
      bgSpTokenCache.token = data.access_token
      bgSpTokenCache.expiresAt = Date.now() + (data.expires_in || 3600) * 1000
      return bgSpTokenCache.token
    }
  } catch (error) {
    console.error('[Background] Token error:', error.message)
  }

  return null
}

/**
 * GET /api/chat-messages/:id/status
 * Check status of a specific message (for polling)
 */
router.get('/chat-messages/:id/status', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const userEmail = req.headers['x-forwarded-email'] || 'unknown'

    const sql = `
      SELECT cm.id, cm.role, cm.content, cm.status, cm.created_at
      FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      WHERE cm.id = $1 AND cs.user_email = $2
    `

    const rows = await query(token, sql, [req.params.id, userEmail])

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' })
    }

    res.json(rows[0])
  } catch (error) {
    console.error('GET /api/chat-messages/:id/status error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * PATCH /api/chat-messages/:id
 * Update a message (e.g., change status from 'processing' to 'completed')
 */
router.patch('/chat-messages/:id', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const userEmail = req.headers['x-forwarded-email'] || 'unknown'
    const { content, status } = req.body

    // Build update
    const sets = []
    const params = []
    let idx = 1

    if (content !== undefined) {
      sets.push(`content = $${idx++}`)
      params.push(content)
    }
    if (status !== undefined) {
      sets.push(`status = $${idx++}`)
      params.push(status)
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    params.push(req.params.id)
    params.push(userEmail)

    // Update message only if user owns the session
    const sql = `
      UPDATE chat_messages cm
      SET ${sets.join(', ')}
      FROM chat_sessions cs
      WHERE cm.id = $${idx}
        AND cm.session_id = cs.id
        AND cs.user_email = $${idx + 1}
      RETURNING cm.id, cm.session_id, cm.role, cm.content, cm.status, cm.created_at
    `

    const rows = await query(token, sql, params)

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' })
    }

    res.json(rows[0])
  } catch (error) {
    console.error('PATCH /api/chat-messages/:id error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// -------------------------------------------------------------------
// Transform helpers
// -------------------------------------------------------------------

function formatValue(valueCents) {
  if (!valueCents || valueCents === 0) return '$0'
  const k = valueCents / 100000
  if (k >= 1000) return `$${(k / 1000).toFixed(1)}M`
  return `$${Math.round(k)}K`
}

function transformUseCase(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    account: row.account_name || '',
    accountId: row.account_id,
    owner: row.owner_name || '',
    ownerId: row.owner_id,
    stage: row.stage,
    value: formatValue(row.value_cents),
    valueCents: row.value_cents,
    databricksServices: row.databricks_services || [],
    nextSteps: row.next_steps || [],
    stakeholders: row.stakeholders || [],
    goLiveDate: row.go_live_date || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function transformMeetingNote(row, extractedUseCases) {
  return {
    id: row.id,
    filename: row.filename,
    account: row.account_name || '',
    accountId: row.account_id,
    summary: row.summary || '',
    attendees: row.attendees || [],
    uploadDate: new Date(row.uploaded_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    uploadedAt: row.uploaded_at,
    extractedUseCases: extractedUseCases.map((euc) => ({
      id: euc.id,
      title: euc.title,
      description: euc.description || '',
      stage: euc.suggested_stage || 'validating',
      nextSteps: euc.next_steps || [],
      linkedUseCaseId: euc.linked_use_case_id,
    })),
  }
}

export default router
