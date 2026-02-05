/**
 * Context Search Routes (RAG)
 *
 * Handles semantic search over embedded content for context retrieval
 */

import express from 'express'
import pg from 'pg'
import { config } from '../config.js'
import { generateEmbedding } from '../services/embedding.js'

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
 * POST /api/context-search
 * Semantic search over embedded content
 *
 * Body: { query, limit?, sourceTypes?, accountId?, minSimilarity? }
 */
router.post('/', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const {
      query: searchQuery,
      limit = 5,
      sourceTypes,
      accountId,
      minSimilarity = 0.5
    } = req.body

    if (!searchQuery) {
      return res.status(400).json({ error: 'query is required' })
    }

    console.log(`Context search: "${searchQuery.substring(0, 50)}..."`)

    // Generate embedding for the query
    const embedding = await generateEmbedding(searchQuery)

    if (!embedding) {
      console.warn('Could not generate embedding, falling back to keyword search')
      return res.json({ results: [], fallback: true })
    }

    // Build the query with filters
    const conditions = ['1 - (embedding <=> $1) >= $2']
    const params = [`[${embedding.join(',')}]`, minSimilarity]
    let paramIdx = 3

    if (sourceTypes && sourceTypes.length > 0) {
      conditions.push(`source_type = ANY($${paramIdx++})`)
      params.push(sourceTypes)
    }

    if (accountId) {
      conditions.push(`account_id = $${paramIdx++}`)
      params.push(accountId)
    }

    params.push(limit)

    const sql = `
      SELECT
        id, source_type, source_id, content_summary, account_id, metadata,
        1 - (embedding <=> $1) AS similarity
      FROM context_embeddings
      WHERE ${conditions.join(' AND ')}
      ORDER BY embedding <=> $1
      LIMIT $${paramIdx}
    `

    const rows = await query(token, sql, params)

    // Enrich results with source details
    const enrichedResults = await enrichResults(token, rows)

    console.log(`Context search found ${enrichedResults.length} results`)

    res.json({
      results: enrichedResults,
      query: searchQuery,
    })
  } catch (error) {
    console.error('POST /api/context-search error:', error.message)

    // If pgvector not enabled, return empty results gracefully
    if (error.message.includes('vector') || error.message.includes('operator does not exist')) {
      return res.json({
        results: [],
        error: 'Vector search not available. Run migration_v6_pgvector.sql to enable.'
      })
    }

    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/context-search/stats
 * Get embedding statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const token = req.userToken
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const sql = `
      SELECT
        source_type,
        COUNT(*)::int AS count
      FROM context_embeddings
      GROUP BY source_type
      ORDER BY count DESC
    `

    const rows = await query(token, sql, [])

    const total = rows.reduce((sum, r) => sum + r.count, 0)

    res.json({
      total,
      bySourceType: rows.reduce((acc, r) => {
        acc[r.source_type] = r.count
        return acc
      }, {}),
    })
  } catch (error) {
    console.error('GET /api/context-search/stats error:', error.message)

    // If table doesn't exist, return zeros
    if (error.message.includes('does not exist')) {
      return res.json({ total: 0, bySourceType: {} })
    }

    res.status(500).json({ error: error.message })
  }
})

/**
 * Enrich search results with source details
 */
async function enrichResults(token, rows) {
  const enriched = []

  for (const row of rows) {
    const result = {
      id: row.id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      contentSummary: row.content_summary,
      similarity: parseFloat(row.similarity.toFixed(4)),
      accountId: row.account_id,
      metadata: row.metadata,
    }

    // Fetch source details based on type
    try {
      if (row.source_type === 'meeting_note') {
        const sourceRows = await query(token, `
          SELECT mn.filename, mn.summary, a.name AS account_name
          FROM meeting_notes mn
          LEFT JOIN accounts a ON mn.account_id = a.id
          WHERE mn.id = $1
        `, [row.source_id])

        if (sourceRows.length > 0) {
          result.source = {
            filename: sourceRows[0].filename,
            summary: sourceRows[0].summary,
            accountName: sourceRows[0].account_name,
          }
        }
      } else if (row.source_type === 'use_case') {
        const sourceRows = await query(token, `
          SELECT uc.title, uc.description, uc.stage, a.name AS account_name
          FROM use_cases uc
          LEFT JOIN accounts a ON uc.account_id = a.id
          WHERE uc.id = $1
        `, [row.source_id])

        if (sourceRows.length > 0) {
          result.source = {
            title: sourceRows[0].title,
            description: sourceRows[0].description,
            stage: sourceRows[0].stage,
            accountName: sourceRows[0].account_name,
          }
        }
      } else if (row.source_type === 'report') {
        const sourceRows = await query(token, `
          SELECT title, report_type, scope, a.name AS account_name
          FROM reports r
          LEFT JOIN accounts a ON r.account_id = a.id
          WHERE r.id = $1
        `, [row.source_id])

        if (sourceRows.length > 0) {
          result.source = {
            title: sourceRows[0].title,
            reportType: sourceRows[0].report_type,
            scope: sourceRows[0].scope,
            accountName: sourceRows[0].account_name,
          }
        }
      }
    } catch (e) {
      console.warn(`Could not enrich source ${row.source_type}/${row.source_id}:`, e.message)
    }

    enriched.push(result)
  }

  return enriched
}

export default router
