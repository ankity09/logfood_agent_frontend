/**
 * Lakebase Data API routes
 *
 * Proxies frontend requests to the Lakebase PostgREST-compatible Data API.
 * All routes require a valid Databricks OAuth token for authentication.
 */

import express from 'express'
import { config } from './config.js'

const router = express.Router()
const LAKEBASE_URL = config.lakebase.restUrl

/**
 * Helper: call the Lakebase Data API
 */
async function lakebaseRequest(path, { token, method = 'GET', body, headers: extra = {} } = {}) {
  const url = `${LAKEBASE_URL}${path}`
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extra,
  }

  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(url, opts)
  if (!res.ok) {
    const text = await res.text()
    const err = new Error(`Lakebase API error ${res.status}: ${text}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

// -------------------------------------------------------------------
// USE CASES
// -------------------------------------------------------------------

/**
 * GET /api/use-cases
 * Query params: stage, service, date, search
 * Returns use cases joined with account name and owner name
 */
router.get('/use-cases', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    // Build query params for PostgREST
    // Select use_cases with embedded account name and owner name
    const params = new URLSearchParams()
    params.set('select', 'id,title,description,stage,value_cents,databricks_services,next_steps,stakeholders,created_at,updated_at,accounts(id,name),users(id,name)')
    params.set('order', 'created_at.desc')

    // Filters
    if (req.query.stage && req.query.stage !== 'all') {
      params.append('stage', `eq.${req.query.stage}`)
    }
    if (req.query.service && req.query.service !== 'all') {
      params.append('databricks_services', `cs.{${req.query.service}}`)
    }
    if (req.query.search) {
      // PostgREST full-text or ilike on title
      params.append('or', `(title.ilike.*${req.query.search}*,description.ilike.*${req.query.search}*)`)
    }
    if (req.query.date && req.query.date !== 'all') {
      const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
      const days = daysMap[req.query.date]
      if (days) {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString()
        params.append('created_at', `gte.${cutoff}`)
      }
    }

    const data = await lakebaseRequest(`/public/use_cases?${params.toString()}`, { token })

    // Transform to frontend shape
    const useCases = data.map(transformUseCase)
    res.json(useCases)
  } catch (error) {
    console.error('GET /api/use-cases error:', error.message)
    res.status(error.status || 500).json({ error: error.message })
  }
})

/**
 * GET /api/use-cases/:id
 */
router.get('/use-cases/:id', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const params = new URLSearchParams()
    params.set('select', 'id,title,description,stage,value_cents,databricks_services,next_steps,stakeholders,created_at,updated_at,accounts(id,name),users(id,name)')
    params.set('id', `eq.${req.params.id}`)

    const data = await lakebaseRequest(`/public/use_cases?${params.toString()}`, {
      token,
      headers: { Accept: 'application/vnd.pgrst.object+json' },
    })

    res.json(transformUseCase(data))
  } catch (error) {
    console.error('GET /api/use-cases/:id error:', error.message)
    res.status(error.status || 500).json({ error: error.message })
  }
})

/**
 * POST /api/use-cases
 * Create a new use case
 */
router.post('/use-cases', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const data = await lakebaseRequest('/public/use_cases', {
      token,
      method: 'POST',
      body: req.body,
      headers: { Prefer: 'return=representation' },
    })

    res.status(201).json(data)
  } catch (error) {
    console.error('POST /api/use-cases error:', error.message)
    res.status(error.status || 500).json({ error: error.message })
  }
})

/**
 * PATCH /api/use-cases/:id
 * Update a use case (e.g. stage transition)
 */
router.patch('/use-cases/:id', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const data = await lakebaseRequest(`/public/use_cases?id=eq.${req.params.id}`, {
      token,
      method: 'PATCH',
      body: req.body,
      headers: { Prefer: 'return=representation' },
    })

    res.json(data)
  } catch (error) {
    console.error('PATCH /api/use-cases/:id error:', error.message)
    res.status(error.status || 500).json({ error: error.message })
  }
})

// -------------------------------------------------------------------
// ACCOUNTS
// -------------------------------------------------------------------

router.get('/accounts', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const data = await lakebaseRequest('/public/accounts?order=name.asc', { token })
    res.json(data)
  } catch (error) {
    console.error('GET /api/accounts error:', error.message)
    res.status(error.status || 500).json({ error: error.message })
  }
})

// -------------------------------------------------------------------
// MEETING NOTES
// -------------------------------------------------------------------

router.get('/meeting-notes', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const params = new URLSearchParams()
    params.set('select', 'id,filename,summary,attendees,uploaded_at,accounts(id,name),extracted_use_cases(id,title,description,suggested_stage,next_steps,linked_use_case_id)')
    params.set('order', 'uploaded_at.desc')

    const data = await lakebaseRequest(`/public/meeting_notes?${params.toString()}`, { token })

    const notes = data.map(transformMeetingNote)
    res.json(notes)
  } catch (error) {
    console.error('GET /api/meeting-notes error:', error.message)
    res.status(error.status || 500).json({ error: error.message })
  }
})

router.post('/meeting-notes', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const data = await lakebaseRequest('/public/meeting_notes', {
      token,
      method: 'POST',
      body: req.body,
      headers: { Prefer: 'return=representation' },
    })

    res.status(201).json(data)
  } catch (error) {
    console.error('POST /api/meeting-notes error:', error.message)
    res.status(error.status || 500).json({ error: error.message })
  }
})

// -------------------------------------------------------------------
// EXTRACTED USE CASES
// -------------------------------------------------------------------

router.post('/extracted-use-cases', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const data = await lakebaseRequest('/public/extracted_use_cases', {
      token,
      method: 'POST',
      body: req.body,
      headers: { Prefer: 'return=representation' },
    })

    res.status(201).json(data)
  } catch (error) {
    console.error('POST /api/extracted-use-cases error:', error.message)
    res.status(error.status || 500).json({ error: error.message })
  }
})

// -------------------------------------------------------------------
// ACTIVITIES
// -------------------------------------------------------------------

router.get('/activities', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const limit = req.query.limit || 10
    const params = new URLSearchParams()
    params.set('select', 'id,type,description,created_at,accounts(id,name)')
    params.set('order', 'created_at.desc')
    params.set('limit', String(limit))

    const data = await lakebaseRequest(`/public/activities?${params.toString()}`, { token })
    res.json(data)
  } catch (error) {
    console.error('GET /api/activities error:', error.message)
    res.status(error.status || 500).json({ error: error.message })
  }
})

router.post('/activities', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const data = await lakebaseRequest('/public/activities', {
      token,
      method: 'POST',
      body: req.body,
      headers: { Prefer: 'return=representation' },
    })

    res.status(201).json(data)
  } catch (error) {
    console.error('POST /api/activities error:', error.message)
    res.status(error.status || 500).json({ error: error.message })
  }
})

// -------------------------------------------------------------------
// STATS (aggregated for Overview dashboard)
// -------------------------------------------------------------------

router.get('/stats', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    // Fetch counts in parallel
    const [useCases, accounts, meetingNotes] = await Promise.all([
      lakebaseRequest('/public/use_cases?select=id,stage', { token }),
      lakebaseRequest('/public/accounts?select=id', { token }),
      lakebaseRequest('/public/meeting_notes?select=id,uploaded_at', { token }),
    ])

    // Stage counts
    const stageCounts = {}
    for (const uc of useCases) {
      stageCounts[uc.stage] = (stageCounts[uc.stage] || 0) + 1
    }

    // Meeting notes this month
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const meetingsThisMonth = meetingNotes.filter(
      (mn) => mn.uploaded_at >= thisMonth
    ).length

    // Live use cases = conversion rate
    const liveCount = stageCounts['live'] || 0
    const totalUseCases = useCases.length
    const conversionRate = totalUseCases > 0 ? Math.round((liveCount / totalUseCases) * 100) : 0

    res.json({
      totalUseCases,
      totalAccounts: accounts.length,
      meetingsThisMonth,
      conversionRate,
      stageCounts,
    })
  } catch (error) {
    console.error('GET /api/stats error:', error.message)
    res.status(error.status || 500).json({ error: error.message })
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
    account: row.accounts?.name || '',
    accountId: row.accounts?.id || '',
    owner: row.users?.name || '',
    ownerId: row.users?.id || '',
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

function transformMeetingNote(row) {
  return {
    id: row.id,
    filename: row.filename,
    account: row.accounts?.name || '',
    accountId: row.accounts?.id || '',
    summary: row.summary || '',
    attendees: row.attendees || [],
    uploadDate: new Date(row.uploaded_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    uploadedAt: row.uploaded_at,
    extractedUseCases: (row.extracted_use_cases || []).map((euc) => ({
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
