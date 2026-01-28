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

let diagnosticRan = false

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
// DIAGNOSTICS
// -------------------------------------------------------------------

router.get('/lakebase-health', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'No token', hint: 'x-forwarded-access-token header missing' })

    // Run multiple diagnostic queries
    const [infoRows, schemaRows, tableRows, countRows] = await Promise.all([
      query(token, "SELECT current_user AS pg_user, current_database() AS db, current_schema() AS current_schema, setting AS search_path FROM pg_settings WHERE name = 'search_path'"),
      query(token, "SELECT schema_name FROM information_schema.schemata ORDER BY schema_name"),
      query(token, "SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'use_cases'"),
      query(token, 'SELECT COUNT(*)::int AS cnt FROM use_cases').catch((err) => [{ cnt: -1, error: err.message }]),
    ])

    res.json({
      status: 'connected',
      pgUser: infoRows[0]?.pg_user,
      database: infoRows[0]?.db,
      currentSchema: infoRows[0]?.current_schema,
      searchPath: infoRows[0]?.search_path,
      schemas: schemaRows.map((r) => r.schema_name),
      useCasesTableLocation: tableRows.map((r) => `${r.table_schema}.${r.table_name}`),
      useCaseCount: countRows[0]?.cnt,
      countError: countRows[0]?.error || null,
    })
  } catch (error) {
    console.error('Lakebase health check failed:', error.message)
    res.status(500).json({ status: 'error', error: error.message })
  }
})

// -------------------------------------------------------------------
// SEED (one-time data insertion)
// -------------------------------------------------------------------

router.post('/seed', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    // Check if data already exists
    const existing = await query(token, 'SELECT COUNT(*)::int AS cnt FROM use_cases')
    if (existing[0].cnt > 0) {
      return res.json({ status: 'skipped', message: `Data already exists (${existing[0].cnt} use cases)` })
    }

    // Insert seed data in order (respecting foreign keys)
    await query(token, `
      INSERT INTO accounts (id, name, industry) VALUES
        ('a0000000-0000-0000-0000-000000000001', 'Acme Corporation',     'Technology'),
        ('a0000000-0000-0000-0000-000000000002', 'TechStart Inc',        'Fintech'),
        ('a0000000-0000-0000-0000-000000000003', 'DataFlow Systems',     'Manufacturing'),
        ('a0000000-0000-0000-0000-000000000004', 'CloudNine Analytics',  'E-commerce'),
        ('a0000000-0000-0000-0000-000000000005', 'MetricPulse AI',       'AI/Analytics')
      ON CONFLICT (id) DO NOTHING
    `)

    await query(token, `
      INSERT INTO users (id, name, email, role) VALUES
        ('u0000000-0000-0000-0000-000000000001', 'Sarah Chen',   'sarah.chen@company.com',   'Solutions Architect'),
        ('u0000000-0000-0000-0000-000000000002', 'Mike Johnson', 'mike.johnson@company.com', 'Solutions Architect'),
        ('u0000000-0000-0000-0000-000000000003', 'Lisa Park',    'lisa.park@company.com',    'Solutions Architect'),
        ('u0000000-0000-0000-0000-000000000004', 'James Lee',    'james.lee@company.com',    'Solutions Architect'),
        ('u0000000-0000-0000-0000-000000000005', 'Anna Kim',     'anna.kim@company.com',     'Solutions Architect')
      ON CONFLICT (id) DO NOTHING
    `)

    await query(token, `
      INSERT INTO use_cases (id, title, description, account_id, owner_id, stage, value_cents, databricks_services, next_steps, stakeholders, created_at) VALUES
        ('uc000000-0000-0000-0000-000000000001', 'Real-time Data Lakehouse', 'Implementing a real-time data lakehouse architecture for unified analytics across all business units.', 'a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'evaluating', 25000000, ARRAY['DBSQL', 'Unity Catalog'], ARRAY['Schedule technical deep-dive', 'Prepare POC environment', 'Share architecture document'], ARRAY['VP Engineering', 'Data Team Lead', 'CTO'], '2025-01-13T00:00:00Z'),
        ('uc000000-0000-0000-0000-000000000002', 'ML Pipeline Automation', 'Automating ML model training and deployment pipelines with MLflow and Databricks Jobs.', 'a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'confirming', 18000000, ARRAY['AI/ML', 'Unity Catalog'], ARRAY['Send updated pricing proposal', 'Align on timeline with engineering'], ARRAY['ML Engineering Lead', 'VP Data Science'], '2024-12-27T00:00:00Z'),
        ('uc000000-0000-0000-0000-000000000003', 'Customer 360 Analytics', 'Building a unified customer view across all touchpoints using Delta Lake and DBSQL dashboards.', 'a0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000002', 'validating', 12000000, ARRAY['AI/BI', 'DBSQL'], ARRAY['Map data sources', 'Schedule data audit', 'Identify stakeholders'], ARRAY['CTO', 'Data Team Lead'], '2025-01-24T00:00:00Z'),
        ('uc000000-0000-0000-0000-000000000004', 'Fraud Detection System', 'Real-time fraud detection using machine learning models on Databricks with feature store.', 'a0000000-0000-0000-0000-000000000002', 'u0000000-0000-0000-0000-000000000002', 'scoping', 30000000, ARRAY['AI/ML', 'DBSQL'], ARRAY['Define model requirements', 'Assess data readiness', 'Plan feature engineering'], ARRAY['Head of Risk', 'ML Engineering Lead'], '2025-01-20T00:00:00Z'),
        ('uc000000-0000-0000-0000-000000000005', 'Data Governance Platform', 'Enterprise-wide data governance and compliance platform using Unity Catalog.', 'a0000000-0000-0000-0000-000000000003', 'u0000000-0000-0000-0000-000000000003', 'confirming', 20000000, ARRAY['Unity Catalog'], ARRAY['Finalize contract terms', 'Schedule kickoff meeting'], ARRAY['Chief Data Officer', 'Compliance Lead'], '2025-01-06T00:00:00Z'),
        ('uc000000-0000-0000-0000-000000000006', 'Predictive Maintenance', 'IoT-driven predictive maintenance for manufacturing using streaming and ML.', 'a0000000-0000-0000-0000-000000000003', 'u0000000-0000-0000-0000-000000000003', 'evaluating', 35000000, ARRAY['AI/ML', 'DBSQL', 'Unity Catalog'], ARRAY['Set up streaming POC', 'Connect IoT data sources', 'Train baseline model'], ARRAY['VP Manufacturing', 'IoT Platform Lead'], '2025-01-13T00:00:00Z'),
        ('uc000000-0000-0000-0000-000000000007', 'Recommendation Engine', 'Personalized recommendation engine for e-commerce powered by Databricks ML.', 'a0000000-0000-0000-0000-000000000004', 'u0000000-0000-0000-0000-000000000004', 'live', 15000000, ARRAY['AI/ML', 'AI/BI'], ARRAY['Monitor model performance', 'Plan quarterly review'], ARRAY['VP Product', 'Data Science Lead'], '2024-11-27T00:00:00Z'),
        ('uc000000-0000-0000-0000-000000000008', 'Supply Chain Optimization', 'AI-driven supply chain forecasting and optimization with DBSQL dashboards.', 'a0000000-0000-0000-0000-000000000004', 'u0000000-0000-0000-0000-000000000004', 'validating', 28000000, ARRAY['AI/BI', 'DBSQL', 'AI/ML'], ARRAY['Discovery call', 'Assess current data infrastructure', 'Identify quick wins'], ARRAY['VP Operations', 'Supply Chain Director'], '2025-01-20T00:00:00Z'),
        ('uc000000-0000-0000-0000-000000000009', 'NLP Document Processing', 'Automated document processing using NLP models with foundation model APIs.', 'a0000000-0000-0000-0000-000000000005', 'u0000000-0000-0000-0000-000000000005', 'scoping', 17500000, ARRAY['AI/ML'], ARRAY['Document corpus analysis', 'Model selection', 'Define accuracy targets'], ARRAY['Head of AI', 'Product Manager'], '2025-01-22T00:00:00Z'),
        ('uc000000-0000-0000-0000-000000000010', 'Executive BI Dashboards', 'AI/BI-powered executive dashboards with natural language querying.', 'a0000000-0000-0000-0000-000000000005', 'u0000000-0000-0000-0000-000000000005', 'onboarding', 9000000, ARRAY['AI/BI', 'DBSQL'], ARRAY['Set up workspace access', 'Configure data connections', 'Train end users'], ARRAY['CEO', 'CFO', 'Head of Analytics'], '2024-12-27T00:00:00Z')
      ON CONFLICT (id) DO NOTHING
    `)

    await query(token, `
      INSERT INTO meeting_notes (id, filename, account_id, summary, attendees, uploaded_at) VALUES
        ('mn000000-0000-0000-0000-000000000001', 'acme-quarterly-review-q4.txt', 'a0000000-0000-0000-0000-000000000001', 'Quarterly review focused on expanding data lakehouse deployment and introducing ML pipeline automation. Client expressed strong interest in real-time analytics capabilities.', ARRAY['Sarah Chen', 'John Smith (Acme)', 'VP Engineering (Acme)'], '2026-01-25T00:00:00Z'),
        ('mn000000-0000-0000-0000-000000000002', 'techstart-kickoff-meeting.txt', 'a0000000-0000-0000-0000-000000000002', 'Initial discovery call with TechStart. They are evaluating solutions for customer analytics and fraud detection. Budget approved for Q1 initiatives.', ARRAY['Mike Johnson', 'CTO (TechStart)', 'Data Team Lead (TechStart)'], '2026-01-22T00:00:00Z')
      ON CONFLICT (id) DO NOTHING
    `)

    await query(token, `
      INSERT INTO extracted_use_cases (id, meeting_note_id, title, description, suggested_stage, next_steps) VALUES
        ('ex000000-0000-0000-0000-000000000001', 'mn000000-0000-0000-0000-000000000001', 'Real-time Analytics Dashboard', 'Client wants real-time analytics dashboard integrated with their existing data lakehouse for executive visibility.', 'evaluating', ARRAY['Schedule technical deep-dive', 'Prepare POC environment', 'Share architecture document']),
        ('ex000000-0000-0000-0000-000000000002', 'mn000000-0000-0000-0000-000000000001', 'ML Pipeline v2 Upgrade', 'Upgrade existing ML pipeline to support automated retraining and A/B model testing.', 'confirming', ARRAY['Send updated pricing proposal', 'Align on timeline with engineering']),
        ('ex000000-0000-0000-0000-000000000003', 'mn000000-0000-0000-0000-000000000002', 'Customer 360 Platform', 'Unified customer view combining web, mobile, and in-store data for personalized marketing.', 'validating', ARRAY['Map data sources', 'Schedule data audit', 'Identify stakeholders'])
      ON CONFLICT (id) DO NOTHING
    `)

    await query(token, `
      INSERT INTO activities (type, description, account_id, created_at) VALUES
        ('meeting', 'Meeting with Acme Corp - Discussed data lakehouse POC', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 hours'),
        ('usecase', 'New use case created: Real-time analytics for TechStart', 'a0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '4 hours'),
        ('note',    'Meeting notes uploaded for DataFlow Inc quarterly review', 'a0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '6 hours'),
        ('usecase', 'Use case "ML Pipeline" moved to Confirming stage', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day'),
        ('meeting', 'Follow-up scheduled with CloudNine for next Tuesday', 'a0000000-0000-0000-0000-000000000004', NOW() - INTERVAL '1 day')
    `)

    // Verify
    const counts = await query(token, `
      SELECT 'accounts' AS tbl, COUNT(*)::int AS cnt FROM accounts
      UNION ALL SELECT 'users', COUNT(*) FROM users
      UNION ALL SELECT 'use_cases', COUNT(*) FROM use_cases
      UNION ALL SELECT 'meeting_notes', COUNT(*) FROM meeting_notes
      UNION ALL SELECT 'extracted_use_cases', COUNT(*) FROM extracted_use_cases
      UNION ALL SELECT 'activities', COUNT(*) FROM activities
    `)

    const result = {}
    for (const row of counts) result[row.tbl] = row.cnt

    console.log('SEED: Data inserted successfully:', JSON.stringify(result))
    res.json({ status: 'seeded', counts: result })
  } catch (error) {
    console.error('SEED error:', error.message)
    res.status(500).json({ status: 'error', error: error.message })
  }
})

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
    console.log(`GET /api/use-cases: token present (${token.substring(0, 8)}...), filters:`, req.query)

    // One-time diagnostic: log schema info to app logs
    if (!diagnosticRan) {
      diagnosticRan = true
      try {
        const diag = await query(token, `
          SELECT current_user AS pg_user, current_database() AS db, current_schema() AS cur_schema
        `)
        console.log('DIAG: connection info:', JSON.stringify(diag[0]))

        const schemas = await query(token, "SELECT schema_name FROM information_schema.schemata ORDER BY schema_name")
        console.log('DIAG: visible schemas:', schemas.map(r => r.schema_name).join(', '))

        const tables = await query(token, "SELECT table_schema, table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY table_schema, table_name")
        console.log('DIAG: user tables:', tables.map(r => `${r.table_schema}.${r.table_name}`).join(', '))

        const searchPath = await query(token, "SHOW search_path")
        console.log('DIAG: search_path:', JSON.stringify(searchPath[0]))

        // Try counting with explicit public schema
        const cnt = await query(token, 'SELECT COUNT(*)::int AS cnt FROM public.use_cases').catch(e => [{ cnt: -1, err: e.message }])
        console.log('DIAG: public.use_cases count:', JSON.stringify(cnt[0]))
      } catch (diagErr) {
        console.error('DIAG error:', diagErr.message)
      }
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
    console.error('GET /api/stats error:', error.message, error.stack)
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
