import { motion } from 'framer-motion'
import {
  TrendingUp,
  Users,
  Target,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
} from 'lucide-react'
import { StatCard, ChartCard } from '../ui/Card'

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

function UseCasePipeline() {
  const stages = [
    { name: 'Discovery', count: 12, color: 'bg-neon-blue', width: '100%' },
    { name: 'Qualification', count: 8, color: 'bg-neon-purple', width: '67%' },
    { name: 'POC', count: 5, color: 'bg-primary', width: '42%' },
    { name: 'Negotiation', count: 3, color: 'bg-neon-pink', width: '25%' },
    { name: 'Closed Won', count: 2, color: 'bg-green-400', width: '17%' },
  ]

  return (
    <div className="space-y-4">
      {stages.map((stage, i) => (
        <motion.div
          key={stage.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-4"
        >
          <div className="w-28 text-sm text-gray-400 shrink-0">{stage.name}</div>
          <div className="flex-1 h-8 bg-dark-50 rounded-lg overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: stage.width }}
              transition={{ delay: i * 0.15, duration: 0.8, ease: 'easeOut' }}
              className={`h-full ${stage.color} rounded-lg flex items-center justify-end pr-3`}
            >
              <span className="text-xs font-semibold text-dark">{stage.count}</span>
            </motion.div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function RecentActivity() {
  const activities = [
    { type: 'meeting', text: 'Meeting with Acme Corp - Discussed data lakehouse POC', time: '2 hours ago', icon: <Calendar className="w-4 h-4" /> },
    { type: 'usecase', text: 'New use case created: Real-time analytics for TechStart', time: '4 hours ago', icon: <Target className="w-4 h-4" /> },
    { type: 'note', text: 'Meeting notes uploaded for DataFlow Inc quarterly review', time: '6 hours ago', icon: <FileText className="w-4 h-4" /> },
    { type: 'usecase', text: 'Use case "ML Pipeline" moved to POC stage', time: '1 day ago', icon: <ArrowUpRight className="w-4 h-4" /> },
    { type: 'meeting', text: 'Follow-up scheduled with CloudNine for next Tuesday', time: '1 day ago', icon: <Calendar className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-3">
      {activities.map((activity, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            {activity.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-200 truncate">{activity.text}</p>
            <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export function OverviewDashboard() {
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
          value={30}
          change={12}
          trend="up"
          icon={<Target className="w-5 h-5 text-primary" />}
        />
        <StatCard
          title="Accounts Managed"
          value={18}
          change={5}
          trend="up"
          icon={<Users className="w-5 h-5 text-neon-blue" />}
        />
        <StatCard
          title="Meetings This Month"
          value={24}
          change={-8}
          trend="down"
          icon={<Calendar className="w-5 h-5 text-neon-purple" />}
        />
        <StatCard
          title="Conversion Rate"
          value="67%"
          change={3}
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
          <UseCasePipeline />
        </ChartCard>

        <ChartCard
          title="Recent Activity"
          subtitle="Latest updates across your accounts"
        >
          <RecentActivity />
        </ChartCard>
      </motion.div>

      {/* Top Accounts Table */}
      <motion.div variants={itemVariants}>
        <ChartCard title="Top Accounts" subtitle="By use case activity">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Account</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Use Cases</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Stage</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Trend</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { account: 'Acme Corporation', useCases: 5, stage: 'POC', trend: '+2 this month' },
                  { account: 'TechStart Inc', useCases: 3, stage: 'Discovery', trend: '+1 this month' },
                  { account: 'DataFlow Systems', useCases: 4, stage: 'Negotiation', trend: 'Steady' },
                  { account: 'CloudNine Analytics', useCases: 2, stage: 'Closed Won', trend: '+1 this month' },
                  { account: 'MetricPulse AI', useCases: 3, stage: 'Qualification', trend: '-1 this month' },
                ].map((row, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-white">{row.account}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-300">{row.useCases}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        row.stage === 'Closed Won'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : row.stage === 'POC'
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : row.stage === 'Negotiation'
                              ? 'bg-neon-pink/10 text-neon-pink border border-neon-pink/20'
                              : 'bg-neon-blue/10 text-neon-blue border border-neon-blue/20'
                      }`}>
                        {row.stage}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm flex items-center gap-1 ${
                        row.trend.includes('+') ? 'text-green-400' : row.trend.includes('-') ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {row.trend.includes('+') ? <ArrowUpRight className="w-3 h-3" /> : row.trend.includes('-') ? <ArrowDownRight className="w-3 h-3" /> : null}
                        {row.trend}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </motion.div>
    </motion.div>
  )
}
