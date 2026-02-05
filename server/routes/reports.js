/**
 * Reports Routes
 *
 * Handles AI-generated reports (weekly, monthly, quarterly, custom)
 */

import express from 'express'
import pg from 'pg'
import { config } from '../config.js'

const router = express.Router()

/**
 * Helper: run a query with the user's OAuth token
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

/**
 * Get service principal token for Model Serving calls
 */
let spTokenCache = { token: null, expiresAt: 0 }

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
    console.error('Error getting service principal token:', error.message)
  }

  return null
}

/**
 * GET /api/reports
 * List user's reports
 * Query params: type (optional), account_id (optional)
 */
router.get('/', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const userEmail = req.headers['x-forwarded-email'] || 'unknown'
    const conditions = ['user_email = $1']
    const params = [userEmail]
    let paramIdx = 2

    if (req.query.type) {
      conditions.push(`report_type = $${paramIdx++}`)
      params.push(req.query.type)
    }

    if (req.query.account_id) {
      conditions.push(`account_id = $${paramIdx++}`)
      params.push(req.query.account_id)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    const sql = `
      SELECT
        r.id, r.title, r.report_type, r.scope,
        r.account_id, a.name AS account_name,
        r.generated_by, r.generation_time_ms,
        r.created_at, r.updated_at
      FROM reports r
      LEFT JOIN accounts a ON r.account_id = a.id
      ${where}
      ORDER BY r.created_at DESC
      LIMIT 50
    `

    const rows = await query(token, sql, params)

    res.json(rows.map(row => ({
      id: row.id,
      title: row.title,
      reportType: row.report_type,
      scope: row.scope,
      accountId: row.account_id,
      accountName: row.account_name,
      generatedBy: row.generated_by,
      generationTimeMs: row.generation_time_ms,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })))
  } catch (error) {
    console.error('GET /api/reports error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/reports/:id
 * Get a single report with full content
 */
router.get('/:id', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const userEmail = req.headers['x-forwarded-email'] || 'unknown'

    const sql = `
      SELECT
        r.*, a.name AS account_name
      FROM reports r
      LEFT JOIN accounts a ON r.account_id = a.id
      WHERE r.id = $1 AND r.user_email = $2
    `

    const rows = await query(token, sql, [req.params.id, userEmail])

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' })
    }

    const row = rows[0]
    res.json({
      id: row.id,
      title: row.title,
      reportType: row.report_type,
      scope: row.scope,
      accountId: row.account_id,
      accountName: row.account_name,
      prompt: row.prompt,
      content: row.content,
      structuredData: row.structured_data,
      generatedBy: row.generated_by,
      modelUsed: row.model_used,
      generationTimeMs: row.generation_time_ms,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error) {
    console.error('GET /api/reports/:id error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/reports
 * Generate a new report
 */
router.post('/', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const userEmail = req.headers['x-forwarded-email'] || 'unknown'
    const { reportType, scope, accountId, customPrompt } = req.body

    if (!reportType || !scope) {
      return res.status(400).json({ error: 'reportType and scope are required' })
    }

    if (scope === 'account' && !accountId) {
      return res.status(400).json({ error: 'accountId is required for account-scoped reports' })
    }

    const startTime = Date.now()

    // Gather context data based on scope
    let contextData
    let accountName = null

    if (scope === 'account') {
      contextData = await gatherAccountContext(token, accountId)
      accountName = contextData.accountName
    } else {
      contextData = await gatherAEContext(token, userEmail)
    }

    // Generate report using AI
    const systemPrompt = buildReportSystemPrompt(reportType, scope)
    const userPrompt = buildReportUserPrompt(reportType, scope, contextData, customPrompt)

    // Get token for Model Serving
    const spToken = await getServicePrincipalToken()
    const aiToken = spToken || token

    const endpointUrl = `${config.databricks.instanceUrl}/serving-endpoints/${config.databricks.claudeEndpoint}/invocations`

    console.log(`Generating ${reportType} report for ${scope === 'account' ? accountName : userEmail}`)

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiToken}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4000,
        temperature: 0.4,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Report generation API error (${response.status}):`, errorText)
      return res.status(response.status).json({
        error: 'Failed to generate report',
        details: errorText,
      })
    }

    const data = await response.json()
    let content = ''

    if (data.choices && data.choices[0]?.message?.content) {
      content = data.choices[0].message.content
    } else if (data.output) {
      content = data.output
    } else if (data.predictions?.[0]) {
      content = typeof data.predictions[0] === 'string' ? data.predictions[0] : JSON.stringify(data.predictions[0])
    }

    const generationTime = Date.now() - startTime

    // Generate title
    const title = generateReportTitle(reportType, scope, accountName)

    // Save report to database
    const insertSql = `
      INSERT INTO reports (
        title, report_type, scope, user_email, account_id,
        prompt, content, generated_by, model_used, generation_time_ms
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, title, report_type, scope, account_id, content,
                generated_by, model_used, generation_time_ms, created_at
    `

    const rows = await query(token, insertSql, [
      title,
      reportType,
      scope,
      userEmail,
      accountId || null,
      customPrompt || null,
      content,
      'claude-haiku-4.5',
      config.databricks.claudeEndpoint,
      generationTime,
    ])

    const report = rows[0]

    res.status(201).json({
      id: report.id,
      title: report.title,
      reportType: report.report_type,
      scope: report.scope,
      accountId: report.account_id,
      accountName,
      content: report.content,
      generatedBy: report.generated_by,
      modelUsed: report.model_used,
      generationTimeMs: report.generation_time_ms,
      createdAt: report.created_at,
    })
  } catch (error) {
    console.error('POST /api/reports error:', error.message, error.stack)
    res.status(500).json({ error: error.message })
  }
})

/**
 * DELETE /api/reports/:id
 * Delete a report
 */
router.delete('/:id', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const userEmail = req.headers['x-forwarded-email'] || 'unknown'

    const sql = `
      DELETE FROM reports
      WHERE id = $1 AND user_email = $2
      RETURNING id
    `

    const rows = await query(token, sql, [req.params.id, userEmail])

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' })
    }

    res.json({ success: true, deletedId: rows[0].id })
  } catch (error) {
    console.error('DELETE /api/reports/:id error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Gather context data for account-scoped reports
 */
async function gatherAccountContext(token, accountId) {
  // Get account details
  const accountSql = `
    SELECT id, name, industry, created_at
    FROM accounts WHERE id = $1
  `
  const accountRows = await query(token, accountSql, [accountId])

  if (accountRows.length === 0) {
    throw new Error('Account not found')
  }

  const account = accountRows[0]

  // Get use cases for this account
  const useCasesSql = `
    SELECT
      uc.id, uc.title, uc.description, uc.stage, uc.value_cents,
      uc.databricks_services, uc.next_steps, uc.stakeholders,
      uc.go_live_date, uc.created_at, uc.updated_at,
      u.name AS owner_name
    FROM use_cases uc
    LEFT JOIN users u ON uc.owner_id = u.id
    WHERE uc.account_id = $1
    ORDER BY uc.updated_at DESC
  `
  const useCases = await query(token, useCasesSql, [accountId])

  // Get recent meeting notes
  const meetingNotesSql = `
    SELECT id, filename, summary, attendees, uploaded_at
    FROM meeting_notes
    WHERE account_id = $1
    ORDER BY uploaded_at DESC
    LIMIT 10
  `
  const meetingNotes = await query(token, meetingNotesSql, [accountId])

  // Get recent activities
  const activitiesSql = `
    SELECT type, description, created_at
    FROM activities
    WHERE account_id = $1
    ORDER BY created_at DESC
    LIMIT 20
  `
  const activities = await query(token, activitiesSql, [accountId])

  return {
    accountName: account.name,
    accountIndustry: account.industry,
    useCases,
    meetingNotes,
    activities,
  }
}

/**
 * Gather context data for AE-scoped reports
 */
async function gatherAEContext(token, userEmail) {
  // Get all use cases for this user's accounts
  const useCasesSql = `
    SELECT
      uc.id, uc.title, uc.description, uc.stage, uc.value_cents,
      uc.databricks_services, uc.next_steps, uc.stakeholders,
      uc.go_live_date, uc.created_at, uc.updated_at,
      a.name AS account_name, u.name AS owner_name
    FROM use_cases uc
    LEFT JOIN accounts a ON uc.account_id = a.id
    LEFT JOIN users u ON uc.owner_id = u.id
    ORDER BY uc.updated_at DESC
    LIMIT 50
  `
  const useCases = await query(token, useCasesSql, [])

  // Get recent meeting notes
  const meetingNotesSql = `
    SELECT mn.id, mn.filename, mn.summary, mn.attendees, mn.uploaded_at,
           a.name AS account_name
    FROM meeting_notes mn
    LEFT JOIN accounts a ON mn.account_id = a.id
    ORDER BY mn.uploaded_at DESC
    LIMIT 20
  `
  const meetingNotes = await query(token, meetingNotesSql, [])

  // Get accounts with stats
  const accountsSql = `
    SELECT
      a.id, a.name, a.industry,
      COUNT(DISTINCT uc.id)::int AS use_case_count,
      COALESCE(SUM(uc.value_cents), 0)::bigint AS total_value
    FROM accounts a
    LEFT JOIN use_cases uc ON a.id = uc.account_id
    GROUP BY a.id, a.name, a.industry
    ORDER BY total_value DESC
    LIMIT 20
  `
  const accounts = await query(token, accountsSql, [])

  return {
    useCases,
    meetingNotes,
    accounts,
  }
}

/**
 * Build system prompt for report generation
 */
function buildReportSystemPrompt(reportType, scope) {
  const basePrompt = `You are an expert sales analyst and report writer for a Databricks sales team. Your job is to create clear, actionable reports that help Account Executives understand their pipeline and accounts.`

  const typePrompts = {
    weekly: `Create a weekly status report highlighting key activities, pipeline changes, and priorities for the coming week.`,
    monthly: `Create a comprehensive monthly report with pipeline analysis, account health assessment, and strategic recommendations.`,
    quarterly: `Create a strategic quarterly business review covering pipeline trends, wins/losses analysis, and quarterly objectives.`,
    use_case_summary: `Create a detailed use case analysis report covering pipeline stage distribution, risk factors, and acceleration opportunities.`,
    custom: `Create a report based on the user's specific request.`,
  }

  return `${basePrompt}

${typePrompts[reportType] || typePrompts.custom}

Format the report in clean Markdown with clear sections, bullet points, and tables where appropriate. Include:
- Executive Summary (2-3 sentences)
- Key Metrics
- Detailed Analysis
- Recommendations/Next Steps

Be specific and actionable. Reference specific accounts, use cases, and data points from the provided context.`
}

/**
 * Build user prompt with context data
 */
function buildReportUserPrompt(reportType, scope, contextData, customPrompt) {
  let prompt = ''

  if (scope === 'account') {
    prompt = `Generate a ${reportType} report for account: ${contextData.accountName} (${contextData.accountIndustry || 'Unknown industry'})

## Use Cases (${contextData.useCases.length})
${contextData.useCases.map(uc => `
- **${uc.title}** (${uc.stage})
  - Value: ${formatValue(uc.value_cents)}
  - Owner: ${uc.owner_name || 'Unassigned'}
  - Services: ${uc.databricks_services?.join(', ') || 'None'}
  - Recent updates: ${uc.next_steps?.slice(0, 3).join('; ') || 'None'}
  - Go-live: ${uc.go_live_date || 'TBD'}
`).join('')}

## Recent Meeting Notes (${contextData.meetingNotes.length})
${contextData.meetingNotes.map(mn => `
- ${mn.filename} (${new Date(mn.uploaded_at).toLocaleDateString()})
  Summary: ${mn.summary || 'No summary'}
`).join('')}

## Recent Activities
${contextData.activities.slice(0, 10).map(a => `- [${a.type}] ${a.description}`).join('\n')}
`
  } else {
    prompt = `Generate a ${reportType} report for my portfolio:

## Accounts Summary (${contextData.accounts.length})
${contextData.accounts.map(a => `- ${a.name} (${a.industry || 'Unknown'}): ${a.use_case_count} use cases, ${formatValue(parseInt(a.total_value, 10))} total value`).join('\n')}

## Use Cases (${contextData.useCases.length})
${contextData.useCases.slice(0, 20).map(uc => `
- **${uc.title}** @ ${uc.account_name} (${uc.stage})
  - Value: ${formatValue(uc.value_cents)}
  - Services: ${uc.databricks_services?.join(', ') || 'None'}
  - Go-live: ${uc.go_live_date || 'TBD'}
`).join('')}

## Recent Meeting Notes (${contextData.meetingNotes.length})
${contextData.meetingNotes.slice(0, 10).map(mn => `- ${mn.account_name}: ${mn.filename}`).join('\n')}
`
  }

  if (customPrompt) {
    prompt += `\n## Additional Request\n${customPrompt}`
  }

  return prompt
}

/**
 * Generate report title
 */
function generateReportTitle(reportType, scope, accountName) {
  const date = new Date()
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const typeNames = {
    weekly: 'Weekly Status Report',
    monthly: 'Monthly Review',
    quarterly: 'Quarterly Business Review',
    use_case_summary: 'Use Case Analysis',
    custom: 'Custom Report',
  }

  const typeName = typeNames[reportType] || 'Report'

  if (scope === 'account' && accountName) {
    return `${accountName} - ${typeName} (${dateStr})`
  }

  return `${typeName} - ${dateStr}`
}

/**
 * Format value in cents to display string
 */
function formatValue(valueCents) {
  if (!valueCents || valueCents === 0) return '$0'
  const k = valueCents / 100000
  if (k >= 1000) return `$${(k / 1000).toFixed(1)}M`
  return `$${Math.round(k)}K`
}

export default router
