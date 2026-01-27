import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Users,
  Target,
  FileText,
  Activity,
  Calendar,
  Loader2,
} from 'lucide-react'
import { StatCard, ChartCard } from '../ui/Card'
import { databricksConfig } from '../../config'

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

interface Stats {
  totalUseCases: number
  totalAccounts: number
  meetingsThisMonth: number
  conversionRate: number
  stageCounts: Record<string, number>
}

interface ActivityItem {
  id: string
  type: string
  description: string
  created_at: string
  accounts: { id: string; name: string } | null
}

const stageColors: Record<string, string> = {
  validating: 'bg-neon-blue',
  scoping: 'bg-neon-purple',
  evaluating: 'bg-yellow-400',
  confirming: 'bg-neon-pink',
  onboarding: 'bg-primary',
  live: 'bg-green-400',
}

const stageLabels: Record<string, string> = {
  validating: 'Validating',
  scoping: 'Scoping',
  evaluating: 'Evaluating',
  confirming: 'Confirming',
  onboarding: 'Onboarding',
  live: 'Live',
}

function UseCasePipeline({ stageCounts }: { stageCounts: Record<string, number> }) {
  const stages = Object.keys(stageLabels)
  const maxCount = Math.max(...stages.map((s) => stageCounts[s] || 0), 1)

  return (
    <div className="space-y-4">
      {stages.map((stage, i) => {
        const count = stageCounts[stage] || 0
        const widthPct = `${Math.max((count / maxCount) * 100, 5)}%`
        return (
          <motion.div
            key={stage}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-4"
          >
            <div className="w-28 text-sm text-gray-400 shrink-0">{stageLabels[stage]}</div>
            <div className="flex-1 h-8 bg-dark-50 rounded-lg overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: widthPct }}
                transition={{ delay: i * 0.15, duration: 0.8, ease: 'easeOut' }}
                className={`h-full ${stageColors[stage] || 'bg-gray-500'} rounded-lg flex items-center justify-end pr-3`}
              >
                <span className="text-xs font-semibold text-dark">{count}</span>
              </motion.div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} minutes ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

function RecentActivity({ activities }: { activities: ActivityItem[] }) {
  const iconMap: Record<string, React.ReactNode> = {
    meeting: <Calendar className="w-4 h-4" />,
    usecase: <Target className="w-4 h-4" />,
    note: <FileText className="w-4 h-4" />,
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, i) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            {iconMap[activity.type] || <Activity className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-200 truncate">{activity.description}</p>
            <p className="text-xs text-gray-500 mt-1">{timeAgo(activity.created_at)}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export function OverviewDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, activitiesRes] = await Promise.all([
          fetch(`${databricksConfig.api.baseUrl}${databricksConfig.api.statsEndpoint}`),
          fetch(`${databricksConfig.api.baseUrl}${databricksConfig.api.activitiesEndpoint}?limit=5`),
        ])
        if (statsRes.ok) setStats(await statsRes.json())
        if (activitiesRes.ok) setActivities(await activitiesRes.json())
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 lg:p-8 space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white">Overview</h1>
        <p className="text-gray-400 mt-1">Your account management dashboard at a glance.</p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Use Cases"
          value={stats?.totalUseCases ?? 0}
          change={0}
          trend="up"
          icon={<Target className="w-5 h-5 text-primary" />}
        />
        <StatCard
          title="Accounts Managed"
          value={stats?.totalAccounts ?? 0}
          change={0}
          trend="up"
          icon={<Users className="w-5 h-5 text-neon-blue" />}
        />
        <StatCard
          title="Meetings This Month"
          value={stats?.meetingsThisMonth ?? 0}
          change={0}
          trend="up"
          icon={<Calendar className="w-5 h-5 text-neon-purple" />}
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats?.conversionRate ?? 0}%`}
          change={0}
          trend="up"
          icon={<TrendingUp className="w-5 h-5 text-green-400" />}
        />
      </motion.div>

      {/* Main Content Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Use Case Pipeline"
          subtitle="Current distribution across stages"
          actions={
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <Activity className="w-4 h-4 text-gray-400" />
            </button>
          }
        >
          <UseCasePipeline stageCounts={stats?.stageCounts || {}} />
        </ChartCard>

        <ChartCard
          title="Recent Activity"
          subtitle="Latest updates across your accounts"
        >
          {activities.length > 0 ? (
            <RecentActivity activities={activities} />
          ) : (
            <p className="text-gray-500 text-sm py-8 text-center">No recent activity</p>
          )}
        </ChartCard>
      </motion.div>
    </motion.div>
  )
}
