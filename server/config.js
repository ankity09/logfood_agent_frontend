/**
 * Server Configuration
 *
 * This file centralizes all configuration for the backend server.
 * Values can be overridden via environment variables.
 *
 * Environment Variables:
 * - DATABRICKS_HOST: Databricks workspace URL
 * - DATABRICKS_TOKEN: Personal Access Token or Service Principal token
 * - DATABRICKS_AGENT_ENDPOINT: Multi-agent endpoint for chat/agent UI (Genie + research)
 * - DATABRICKS_CLAUDE_ENDPOINT: Claude endpoint for extraction/update generation
 * - DATABRICKS_CHAT_ENDPOINT: (Legacy) Falls back to this if others not set
 * - LAKEBASE_PG_HOST: Lakebase Postgres host
 * - LAKEBASE_PG_DATABASE: Lakebase database name
 * - LAKEBASE_PG_USER: Lakebase Postgres user (Databricks identity)
 * - CHAT_MAX_TOKENS: Maximum tokens for chat responses
 * - CHAT_TEMPERATURE: Temperature for chat responses
 *
 * In Databricks Apps:
 * - DATABRICKS_HOST is automatically set
 * - Authentication can use the app's service principal
 */

// Detect if running in Databricks Apps environment
const isDatabricksApp = !!process.env.DATABRICKS_APP_NAME

// Default endpoints
const DEFAULT_AGENT_ENDPOINT = 'agents_ankit_yadav-demo-logfood_agent_dev'
const DEFAULT_CLAUDE_ENDPOINT = 'databricks-claude-haiku-4-5'

export const config = {
  databricks: {
    // Workspace URL - auto-detected in Databricks Apps, or override with DATABRICKS_HOST
    instanceUrl:
      process.env.DATABRICKS_HOST ||
      'https://fevm-ay-demo-workspace.cloud.databricks.com',

    // Authentication token
    // In Databricks Apps, you can use the service principal token or set DATABRICKS_TOKEN
    token: process.env.DATABRICKS_TOKEN || '',

    // Multi-agent endpoint for chat UI and Agent tab
    // This endpoint has a supervisor with Genie tables and deep research capabilities
    agentEndpoint:
      process.env.DATABRICKS_AGENT_ENDPOINT || DEFAULT_AGENT_ENDPOINT,

    // Claude endpoint for AI extraction and Salesforce update generation
    claudeEndpoint:
      process.env.DATABRICKS_CLAUDE_ENDPOINT || DEFAULT_CLAUDE_ENDPOINT,

    // Legacy: fallback chat endpoint (used if specific endpoints not configured)
    chatEndpoint:
      process.env.DATABRICKS_CHAT_ENDPOINT || DEFAULT_CLAUDE_ENDPOINT,

    // Flag indicating Databricks Apps environment
    isDatabricksApp,
  },

  lakebase: {
    // Postgres wire protocol connection config
    pgHost:
      process.env.LAKEBASE_PG_HOST ||
      'ep-steep-rice-d2fci9kw.database.us-east-1.cloud.databricks.com',
    pgDatabase: process.env.LAKEBASE_PG_DATABASE || 'databricks_postgres',
    pgUser:
      process.env.LAKEBASE_PG_USER || 'ankit.yadav@databricks.com',
    pgPort: parseInt(process.env.LAKEBASE_PG_PORT || '5432', 10),
  },

  chat: {
    // Maximum tokens for Claude endpoint (extraction, updates)
    maxTokens: parseInt(process.env.CHAT_MAX_TOKENS || '2048', 10),

    // Maximum tokens for agent endpoint (deep research, longer outputs)
    agentMaxTokens: parseInt(process.env.AGENT_MAX_TOKENS || '8192', 10),

    // Temperature for chat responses (0-1)
    temperature: parseFloat(process.env.CHAT_TEMPERATURE || '0.7'),
  },

  server: {
    // Port to run the server on
    port: parseInt(process.env.PORT || '8000', 10),
  },
}

// Validate required configuration
export function validateConfig() {
  const errors = []
  const warnings = []

  if (!config.databricks.token) {
    if (isDatabricksApp) {
      warnings.push('DATABRICKS_TOKEN not set - will attempt to use app service principal')
    } else {
      errors.push('DATABRICKS_TOKEN environment variable is required')
    }
  }

  if (!config.databricks.instanceUrl) {
    errors.push('DATABRICKS_HOST environment variable is required')
  }

  if (warnings.length > 0) {
    console.log('Configuration warnings:')
    warnings.forEach((w) => console.log(`  - ${w}`))
  }

  if (errors.length > 0) {
    console.error('Configuration errors:')
    errors.forEach((e) => console.error(`  - ${e}`))
  }

  return errors.length === 0
}

// Log configuration on startup (without sensitive data)
export function logConfig() {
  console.log('Server Configuration:')
  console.log(`  Environment: ${isDatabricksApp ? 'Databricks App' : 'Standalone'}`)
  console.log(`  Databricks Host: ${config.databricks.instanceUrl}`)
  console.log(`  Agent Endpoint: ${config.databricks.agentEndpoint} (Chat UI, Agent Tab)`)
  console.log(`  Claude Endpoint: ${config.databricks.claudeEndpoint} (Extraction, Updates)`)
  console.log(`  Lakebase PG Host: ${config.lakebase.pgHost || 'Not set'}`)
  console.log(`  Token Configured: ${config.databricks.token ? 'Yes' : 'No'}`)
  console.log(`  Port: ${config.server.port}`)
}
