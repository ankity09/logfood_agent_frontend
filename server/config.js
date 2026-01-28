/**
 * Server Configuration
 *
 * This file centralizes all configuration for the backend server.
 * Values can be overridden via environment variables.
 *
 * Environment Variables:
 * - DATABRICKS_HOST: Databricks workspace URL
 * - DATABRICKS_TOKEN: Personal Access Token or Service Principal token
 * - DATABRICKS_CHAT_ENDPOINT: Model serving endpoint name for chat
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

export const config = {
  databricks: {
    // Workspace URL - auto-detected in Databricks Apps, or override with DATABRICKS_HOST
    instanceUrl:
      process.env.DATABRICKS_HOST ||
      'https://fevm-ay-demo-workspace.cloud.databricks.com',

    // Authentication token
    // In Databricks Apps, you can use the service principal token or set DATABRICKS_TOKEN
    token: process.env.DATABRICKS_TOKEN || '',

    // Chat model serving endpoint name
    chatEndpoint:
      process.env.DATABRICKS_CHAT_ENDPOINT || 'databricks-claude-haiku-4-5',

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
    // Maximum tokens for chat responses
    maxTokens: parseInt(process.env.CHAT_MAX_TOKENS || '1024', 10),

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
  console.log(`  Chat Endpoint: ${config.databricks.chatEndpoint}`)
  console.log(`  Lakebase PG Host: ${config.lakebase.pgHost || 'Not set'}`)
  console.log(`  Token Configured: ${config.databricks.token ? 'Yes' : 'No'}`)
  console.log(`  Port: ${config.server.port}`)
}
