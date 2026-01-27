/**
 * LogFoodAgent Application Configuration
 */

export const appConfig = {
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    chatEndpoint: '/chat',
  },

  // UI Configuration
  ui: {
    chatbot: {
      title: 'LogFood Assistant',
      subtitle: 'Powered by AI',
      placeholder: 'Ask me anything about your accounts...',
      welcomeMessage: "Hello! I'm your LogFood AI assistant. How can I help you with your accounts and use cases today?",
    },
  },
}
