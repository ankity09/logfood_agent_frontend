/**
 * Users/AE Routes
 *
 * Handles listing and managing users (Account Executives)
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
 * GET /api/users
 * List all users (Account Executives)
 * Query params: role (optional filter by role)
 */
router.get('/', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const conditions = []
    const params = []
    let paramIdx = 1

    if (req.query.role) {
      conditions.push(`role = $${paramIdx++}`)
      params.push(req.query.role)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const sql = `
      SELECT
        u.id, u.name, u.email, u.role, u.created_at,
        COUNT(DISTINCT uc.id)::int AS use_case_count,
        COUNT(DISTINCT a.id)::int AS account_count,
        COALESCE(SUM(uc.value_cents), 0)::bigint AS total_value_cents
      FROM users u
      LEFT JOIN use_cases uc ON u.id = uc.owner_id
      LEFT JOIN accounts a ON uc.account_id = a.id
      ${where}
      GROUP BY u.id, u.name, u.email, u.role, u.created_at
      ORDER BY u.name ASC
    `

    const rows = await query(token, sql, params)

    const users = rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.created_at,
      useCaseCount: row.use_case_count,
      accountCount: row.account_count,
      totalValueCents: parseInt(row.total_value_cents, 10),
      totalValue: formatValue(parseInt(row.total_value_cents, 10)),
    }))

    res.json(users)
  } catch (error) {
    console.error('GET /api/users error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/users/:id
 * Get a single user with their accounts and use cases summary
 */
router.get('/:id', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    // Get user
    const userSql = `
      SELECT id, name, email, role, created_at
      FROM users
      WHERE id = $1
    `
    const userRows = await query(token, userSql, [req.params.id])

    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = userRows[0]

    // Get user's use cases with account info
    const useCasesSql = `
      SELECT
        uc.id, uc.title, uc.stage, uc.value_cents,
        a.id AS account_id, a.name AS account_name
      FROM use_cases uc
      LEFT JOIN accounts a ON uc.account_id = a.id
      WHERE uc.owner_id = $1
      ORDER BY uc.updated_at DESC
    `
    const useCaseRows = await query(token, useCasesSql, [req.params.id])

    // Get stage distribution
    const stageCounts = {}
    let totalValue = 0
    for (const uc of useCaseRows) {
      stageCounts[uc.stage] = (stageCounts[uc.stage] || 0) + 1
      totalValue += uc.value_cents || 0
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
      useCases: useCaseRows.map(uc => ({
        id: uc.id,
        title: uc.title,
        stage: uc.stage,
        value: formatValue(uc.value_cents),
        accountId: uc.account_id,
        accountName: uc.account_name,
      })),
      stats: {
        useCaseCount: useCaseRows.length,
        totalValueCents: totalValue,
        totalValue: formatValue(totalValue),
        stageCounts,
      },
    })
  } catch (error) {
    console.error('GET /api/users/:id error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

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
