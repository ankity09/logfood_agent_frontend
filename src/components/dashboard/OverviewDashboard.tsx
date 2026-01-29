import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { DatabricksDashboard } from '@databricks/aibi-client'
import { databricksConfig, getDashboardConfig } from '../../config'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 },
  },
}

export function OverviewDashboard() {
  const containerRef = useRef<HTMLDivElement>(null)
  const dashboardRef = useRef<DatabricksDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // Get dashboard config
  const dashboardConfig = getDashboardConfig('overview')

  // Fetch token from backend
  useEffect(() => {
    async function fetchToken() {
      try {
        const response = await fetch(
          `${databricksConfig.api.baseUrl}${databricksConfig.api.tokenEndpoint}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dashboardId: dashboardConfig.id }),
          }
        )

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || `Failed to get token: ${response.status}`)
        }

        const data = await response.json()
        setToken(data.token)
      } catch (err) {
        console.error('Failed to fetch dashboard token:', err)
        setError(err instanceof Error ? err.message : 'Failed to authenticate for dashboard')
        setLoading(false)
      }
    }

    fetchToken()
  }, [dashboardConfig.id])

  // Initialize dashboard when token is available
  useEffect(() => {
    if (!token || !containerRef.current) return

    // Clean up existing dashboard
    if (dashboardRef.current) {
      dashboardRef.current = null
    }

    try {
      const dashboard = new DatabricksDashboard({
        instanceUrl: dashboardConfig.instanceUrl,
        workspaceId: dashboardConfig.workspaceId,
        dashboardId: dashboardConfig.id,
        token: token,
        container: containerRef.current,
      })

      dashboard.initialize()
      dashboardRef.current = dashboard
      setLoading(false)
      setError(null)
    } catch (err) {
      console.error('Failed to initialize dashboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      setLoading(false)
    }

    // Cleanup on unmount
    return () => {
      dashboardRef.current = null
    }
  }, [token, dashboardConfig])

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    setToken(null)
    // Re-trigger token fetch
    window.location.reload()
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 lg:p-8 space-y-6 h-[calc(100vh-64px)] flex flex-col"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-theme-primary">Overview</h1>
          <p className="text-theme-secondary mt-1">{dashboardConfig.description}</p>
        </div>
        {error && (
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        )}
      </motion.div>

      {/* Dashboard Container */}
      <motion.div
        variants={itemVariants}
        className="flex-1 glass-card overflow-hidden relative"
      >
        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-theme-card z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-theme-secondary">{databricksConfig.ui.dashboard.loadingMessage}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-theme-card z-10">
            <div className="text-center max-w-md px-6">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-theme-primary mb-2">
                Failed to Load Dashboard
              </h3>
              <p className="text-theme-secondary text-sm mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-primary text-dark rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Embed Container */}
        <div
          ref={containerRef}
          id="dashboard-container"
          className="w-full h-full"
          style={{ minHeight: databricksConfig.ui.dashboard.height }}
        />
      </motion.div>
    </motion.div>
  )
}
