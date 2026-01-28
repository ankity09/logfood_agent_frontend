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

const { Pool } = pg
const router = express.Router()

/**
 * Create a pg Pool that uses the user's OAuth token as the password.
 * Lakebase Autoscaling accepts Databricks OAuth tokens as Postgres passwords.
 * We create a shared pool with a dynamic password callback so the token
 * is fetched fresh for each new connection.
 */
let currentToken = ''

const pool = new Pool({
  host: config.lakebase.pgHost,
  port: config.lakebase.pgPort,
  database: config.lakebase.pgDatabase,
  user: config.lakebase.pgUser,
  password: () => currentToken,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

pool.on('error', (err) => {
  console.error('Unexpected Lakebase pool error:', err.message)
})

/**
 * Helper: run a query using the pool with the user's token
 */
async function query(token, text, params = []) {
  currentToken = token
  const result = await pool.query(text, params)
  return result.rows
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
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

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
        uc.created_at, uc.updated_at,
        a.id AS account_id, a.name AS account_name,
        u.id AS owner_id, u.name AS owner_name
      FROM use_cases uc
      LEFT JOIN accounts a ON uc.account_id = a.id
      LEFT JOIN users u ON uc.owner_id = u.id
      ${where}
      ORDER BY uc.created_at DESC
    `

    const rows = await query(token, sql, params)
    const useCases = rows.map(transformUseCase)
    res.json(useCases)
  } catch (error) {
    console.error('GET /api/use-cases error:', error.message)
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
        uc.created_at, uc.updated_at,
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
      value_cents, databricks_services, next_steps, stakeholders,
    } = req.body

    const sql = `
      INSERT INTO use_cases (title, description, account_id, owner_id, stage, value_cents, databricks_services, next_steps, stakeholders)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `

    const rows = await query(token, sql, [
      title, description, account_id, owner_id, stage || 'validating',
      value_cents || 0, databricks_services || [], next_steps || [], stakeholders || [],
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
      'account_id', 'owner_id',
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
    console.error('GET /api/stats error:', error.message)
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
