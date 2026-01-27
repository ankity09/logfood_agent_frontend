/**
 * Databricks Configuration
 *
 * This file contains all Databricks-related configuration settings.
 * Update these values when you need to change dashboards, endpoints, or workspace settings.
 */

export const databricksConfig = {
  // Workspace Configuration
  workspace: {
    instanceUrl: 'https://fevm-ay-demo-workspace.cloud.databricks.com',
    workspaceId: '7474653873260502',
  },

  // AI/BI Dashboard Configuration
  // Add multiple dashboards here and reference them by key
  dashboards: {
    overview: {
      id: '01f0f8f352661100bb5e1d472157f546',
      title: 'Overview Dashboard',
      description: 'Main overview metrics and KPIs',
    },
    // Add more dashboards as needed:
    // analytics: {
    //   id: 'your-analytics-dashboard-id',
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
