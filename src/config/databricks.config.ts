/**
 * Databricks Configuration
 *
 * This file contains all Databricks-related configuration settings.
 * Update these values when you need to change dashboards, endpoints, or workspace settings.
 */

export const databricksConfig = {
  // Workspace Configuration
  // These can be overridden via environment variables for easy deployment changes
  workspace: {
    instanceUrl: import.meta.env.VITE_DATABRICKS_INSTANCE_URL || 'https://fe-sandbox-serverless-9thezy.cloud.databricks.com',
    workspaceId: import.meta.env.VITE_DATABRICKS_WORKSPACE_ID || '7474651123329331',
  },

  // AI/BI Dashboard Configuration
  // Add multiple dashboards here and reference them by key
  // Dashboard IDs can be overridden via environment variables
  dashboards: {
    overview: {
      id: import.meta.env.VITE_DASHBOARD_OVERVIEW_ID || '01f0fd2317471778b706b2e7ec546fcc',
      title: 'Overview Dashboard',
      description: 'Main overview metrics and KPIs',
    },
    // Add more dashboards as needed:
    // analytics: {
    //   id: import.meta.env.VITE_DASHBOARD_ANALYTICS_ID || 'your-analytics-dashboard-id',
    //   title: 'Analytics Dashboard',
    //   description: 'Detailed analytics and trends',
    // },
  },

  // Model Serving Endpoints
  endpoints: {
    chat: {
      name: 'databricks-claude-haiku-4-5',
      // The endpoint URL will be constructed from workspace URL
      // Format: {instanceUrl}/serving-endpoints/{name}/invocations
    },
    // Add more endpoints as needed:
    // embedding: {
    //   name: 'your-embedding-endpoint',
    // },
  },

  // API Configuration
  api: {
    // Backend API URL - update this when deploying
    // In production on Databricks Apps, this will be relative
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',

    // Token endpoint for dashboard authentication
    tokenEndpoint: '/auth/dashboard-token',

    // Chat endpoint for AI assistant
    chatEndpoint: '/chat',

    // Lakebase data endpoints
    useCasesEndpoint: '/use-cases',
    accountsEndpoint: '/accounts',
    meetingNotesEndpoint: '/meeting-notes',
    extractedUseCasesEndpoint: '/extracted-use-cases',
    activitiesEndpoint: '/activities',
    statsEndpoint: '/stats',
    generateUpdateEndpoint: '/generate-update',

    // Chat session persistence endpoints
    chatSessionsEndpoint: '/chat-sessions',
    chatMessagesEndpoint: '/chat-messages',
    chatMessageStatusEndpoint: '/chat-messages', // GET /:id/status
  },

  // UI Configuration
  ui: {
    // Chatbot settings
    chatbot: {
      title: 'LogFood Assistant',
      subtitle: 'Powered by Databricks AI',
      placeholder: 'Ask me anything about your accounts...',
      welcomeMessage: "Hello! I'm your LogFood AI assistant powered by Databricks. How can I help you with your accounts and use cases today?",
    },

    // Dashboard embed settings
    dashboard: {
      height: '800px',
      loadingMessage: 'Loading dashboard...',
      errorMessage: 'Failed to load dashboard. Please check your connection.',
    },
  },
}

// Helper function to get the full endpoint URL
export function getEndpointUrl(endpointName: keyof typeof databricksConfig.endpoints): string {
  const endpoint = databricksConfig.endpoints[endpointName]
  return `${databricksConfig.workspace.instanceUrl}/serving-endpoints/${endpoint.name}/invocations`
}

// Helper function to get dashboard config by key
export function getDashboardConfig(dashboardKey: keyof typeof databricksConfig.dashboards) {
  return {
    ...databricksConfig.dashboards[dashboardKey],
    instanceUrl: databricksConfig.workspace.instanceUrl,
    workspaceId: databricksConfig.workspace.workspaceId,
  }
}

// Type exports for TypeScript support
export type DashboardKey = keyof typeof databricksConfig.dashboards
export type EndpointKey = keyof typeof databricksConfig.endpoints
