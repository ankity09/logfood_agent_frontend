/**
 * Context Indexer Service
 *
 * Automatically indexes content into embeddings for RAG
 */

import pg from 'pg'
import { config } from '../config.js'
import { generateEmbedding } from './embedding.js'

/**
 * Helper: run a query with token
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
    await client.end().catch(() => {})
  }
}

/**
 * Index a meeting note
 *
 * @param {string} token - User's OAuth token
 * @param {string} meetingNoteId - Meeting note ID
 * @param {Object} data - Meeting note data (summary, raw_content, etc.)
 */
export async function indexMeetingNote(token, meetingNoteId, data) {
  try {
    const { summary, raw_content, account_id, filename, structured_summary } = data

    // Build content to embed
    let contentToEmbed = ''
    let contentSummary = ''

    if (structured_summary) {
      // Use structured summary if available
      const ss = typeof structured_summary === 'string' ? JSON.parse(structured_summary) : structured_summary
      contentToEmbed = [
        ss.executive_summary || '',
        ss.key_topics?.map(t => `${t.topic}: ${t.details}`).join('\n') || '',
        ss.decisions?.join('\n') || '',
        ss.action_items?.map(a => `${a.action} (${a.owner || 'unassigned'})`).join('\n') || '',
      ].filter(Boolean).join('\n\n')
      contentSummary = ss.executive_summary || summary || filename
    } else if (raw_content) {
      // Use raw content (truncate for embedding)
      contentToEmbed = raw_content.substring(0, 6000)
      contentSummary = summary || filename
    } else if (summary) {
      contentToEmbed = summary
      contentSummary = summary
    } else {
      console.log(`Skipping meeting note ${meetingNoteId}: no content to embed`)
      return null
    }

    // Generate embedding
    const embedding = await generateEmbedding(contentToEmbed, token)

    if (!embedding) {
      console.warn(`Could not generate embedding for meeting note ${meetingNoteId}`)
      return null
    }

    // Check if embedding already exists
    const existingRows = await query(token, `
      SELECT id FROM context_embeddings
      WHERE source_type = 'meeting_note' AND source_id = $1
    `, [meetingNoteId])

    if (existingRows.length > 0) {
      // Update existing
      await query(token, `
        UPDATE context_embeddings
        SET content_summary = $1, embedding = $2, account_id = $3, updated_at = NOW()
        WHERE source_type = 'meeting_note' AND source_id = $4
      `, [contentSummary, `[${embedding.join(',')}]`, account_id, meetingNoteId])
      console.log(`Updated embedding for meeting note ${meetingNoteId}`)
    } else {
      // Insert new
      await query(token, `
        INSERT INTO context_embeddings (source_type, source_id, content_summary, embedding, account_id)
        VALUES ('meeting_note', $1, $2, $3, $4)
      `, [meetingNoteId, contentSummary, `[${embedding.join(',')}]`, account_id])
      console.log(`Created embedding for meeting note ${meetingNoteId}`)
    }

    return { success: true, sourceId: meetingNoteId }
  } catch (error) {
    console.error(`Error indexing meeting note ${meetingNoteId}:`, error.message)
    return null
  }
}

/**
 * Index a use case
 */
export async function indexUseCase(token, useCaseId, data) {
  try {
    const { title, description, account_id, next_steps, stakeholders, databricks_services } = data

    // Build content to embed
    const contentParts = [
      `Title: ${title}`,
      description || '',
      next_steps?.length ? `Updates: ${next_steps.slice(0, 5).join('; ')}` : '',
      stakeholders?.length ? `Stakeholders: ${stakeholders.join(', ')}` : '',
      databricks_services?.length ? `Services: ${databricks_services.join(', ')}` : '',
    ]

    const contentToEmbed = contentParts.filter(Boolean).join('\n')
    const contentSummary = `${title}: ${description?.substring(0, 200) || 'No description'}`

    if (contentToEmbed.length < 10) {
      console.log(`Skipping use case ${useCaseId}: insufficient content`)
      return null
    }

    // Generate embedding
    const embedding = await generateEmbedding(contentToEmbed, token)

    if (!embedding) {
      console.warn(`Could not generate embedding for use case ${useCaseId}`)
      return null
    }

    // Check if embedding already exists
    const existingRows = await query(token, `
      SELECT id FROM context_embeddings
      WHERE source_type = 'use_case' AND source_id = $1
    `, [useCaseId])

    if (existingRows.length > 0) {
      await query(token, `
        UPDATE context_embeddings
        SET content_summary = $1, embedding = $2, account_id = $3, updated_at = NOW()
        WHERE source_type = 'use_case' AND source_id = $4
      `, [contentSummary, `[${embedding.join(',')}]`, account_id, useCaseId])
      console.log(`Updated embedding for use case ${useCaseId}`)
    } else {
      await query(token, `
        INSERT INTO context_embeddings (source_type, source_id, content_summary, embedding, account_id)
        VALUES ('use_case', $1, $2, $3, $4)
      `, [useCaseId, contentSummary, `[${embedding.join(',')}]`, account_id])
      console.log(`Created embedding for use case ${useCaseId}`)
    }

    return { success: true, sourceId: useCaseId }
  } catch (error) {
    console.error(`Error indexing use case ${useCaseId}:`, error.message)
    return null
  }
}

/**
 * Index a report
 */
export async function indexReport(token, reportId, data) {
  try {
    const { title, content, account_id, report_type } = data

    // Build content to embed (use beginning of report)
    const contentToEmbed = content.substring(0, 6000)
    const contentSummary = `${title} (${report_type})`

    // Generate embedding
    const embedding = await generateEmbedding(contentToEmbed, token)

    if (!embedding) {
      console.warn(`Could not generate embedding for report ${reportId}`)
      return null
    }

    // Check if embedding already exists
    const existingRows = await query(token, `
      SELECT id FROM context_embeddings
      WHERE source_type = 'report' AND source_id = $1
    `, [reportId])

    if (existingRows.length > 0) {
      await query(token, `
        UPDATE context_embeddings
        SET content_summary = $1, embedding = $2, account_id = $3, updated_at = NOW()
        WHERE source_type = 'report' AND source_id = $4
      `, [contentSummary, `[${embedding.join(',')}]`, account_id, reportId])
      console.log(`Updated embedding for report ${reportId}`)
    } else {
      await query(token, `
        INSERT INTO context_embeddings (source_type, source_id, content_summary, embedding, account_id)
        VALUES ('report', $1, $2, $3, $4)
      `, [reportId, contentSummary, `[${embedding.join(',')}]`, account_id])
      console.log(`Created embedding for report ${reportId}`)
    }

    return { success: true, sourceId: reportId }
  } catch (error) {
    console.error(`Error indexing report ${reportId}:`, error.message)
    return null
  }
}

/**
 * Reindex all content (use sparingly)
 */
export async function reindexAll(token) {
  const results = {
    meetingNotes: { success: 0, failed: 0 },
    useCases: { success: 0, failed: 0 },
    reports: { success: 0, failed: 0 },
  }

  try {
    // Reindex meeting notes
    const meetingNotes = await query(token, `
      SELECT id, summary, raw_content, account_id, filename, structured_summary
      FROM meeting_notes
    `, [])

    for (const mn of meetingNotes) {
      const result = await indexMeetingNote(token, mn.id, mn)
      if (result) {
        results.meetingNotes.success++
      } else {
        results.meetingNotes.failed++
      }
      // Rate limit
      await new Promise(r => setTimeout(r, 200))
    }

    // Reindex use cases
    const useCases = await query(token, `
      SELECT id, title, description, account_id, next_steps, stakeholders, databricks_services
      FROM use_cases
    `, [])

    for (const uc of useCases) {
      const result = await indexUseCase(token, uc.id, uc)
      if (result) {
        results.useCases.success++
      } else {
        results.useCases.failed++
      }
      await new Promise(r => setTimeout(r, 200))
    }

    // Reindex reports
    const reports = await query(token, `
      SELECT id, title, content, account_id, report_type
      FROM reports
    `, [])

    for (const r of reports) {
      const result = await indexReport(token, r.id, r)
      if (result) {
        results.reports.success++
      } else {
        results.reports.failed++
      }
      await new Promise(r => setTimeout(r, 200))
    }

    console.log('Reindex complete:', results)
    return results
  } catch (error) {
    console.error('Reindex error:', error.message)
    throw error
  }
}
