import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Target,
  Plus,
  Filter,
  Search,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Users,
  Building2,
} from 'lucide-react'
import { Card } from '../ui/Card'

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

type Stage = 'discovery' | 'qualification' | 'poc' | 'negotiation' | 'closed_won' | 'closed_lost'

interface UseCase {
  id: string
  title: string
  account: string
  stage: Stage
  owner: string
  createdAt: string
  description: string
  value: string
}

const stageConfig: Record<Stage, { label: string; color: string; bgColor: string; borderColor: string }> = {
  discovery: { label: 'Discovery', color: 'text-neon-blue', bgColor: 'bg-neon-blue/10', borderColor: 'border-neon-blue/20' },
  qualification: { label: 'Qualification', color: 'text-neon-purple', bgColor: 'bg-neon-purple/10', borderColor: 'border-neon-purple/20' },
  poc: { label: 'POC', color: 'text-primary', bgColor: 'bg-primary/10', borderColor: 'border-primary/20' },
  negotiation: { label: 'Negotiation', color: 'text-neon-pink', bgColor: 'bg-neon-pink/10', borderColor: 'border-neon-pink/20' },
  closed_won: { label: 'Closed Won', color: 'text-green-400', bgColor: 'bg-green-400/10', borderColor: 'border-green-400/20' },
  closed_lost: { label: 'Closed Lost', color: 'text-red-400', bgColor: 'bg-red-400/10', borderColor: 'border-red-400/20' },
}

const useCases: UseCase[] = [
  { id: '1', title: 'Real-time Data Lakehouse', account: 'Acme Corporation', stage: 'poc', owner: 'Sarah Chen', createdAt: '2 weeks ago', description: 'Implementing a real-time data lakehouse architecture for unified analytics.', value: '$250K' },
  { id: '2', title: 'ML Pipeline Automation', account: 'Acme Corporation', stage: 'negotiation', owner: 'Sarah Chen', createdAt: '1 month ago', description: 'Automating ML model training and deployment pipelines.', value: '$180K' },
  { id: '3', title: 'Customer 360 Analytics', account: 'TechStart Inc', stage: 'discovery', owner: 'Mike Johnson', createdAt: '3 days ago', description: 'Building a unified customer view across all touchpoints.', value: '$120K' },
  { id: '4', title: 'Fraud Detection System', account: 'TechStart Inc', stage: 'qualification', owner: 'Mike Johnson', createdAt: '1 week ago', description: 'Real-time fraud detection using machine learning models.', value: '$300K' },
  { id: '5', title: 'Data Governance Platform', account: 'DataFlow Systems', stage: 'negotiation', owner: 'Lisa Park', createdAt: '3 weeks ago', description: 'Enterprise-wide data governance and compliance platform.', value: '$200K' },
  { id: '6', title: 'Predictive Maintenance', account: 'DataFlow Systems', stage: 'poc', owner: 'Lisa Park', createdAt: '2 weeks ago', description: 'IoT-driven predictive maintenance for manufacturing.', value: '$350K' },
  { id: '7', title: 'Recommendation Engine', account: 'CloudNine Analytics', stage: 'closed_won', owner: 'James Lee', createdAt: '2 months ago', description: 'Personalized recommendation engine for e-commerce.', value: '$150K' },
  { id: '8', title: 'Supply Chain Optimization', account: 'CloudNine Analytics', stage: 'discovery', owner: 'James Lee', createdAt: '1 week ago', description: 'AI-driven supply chain forecasting and optimization.', value: '$280K' },
  { id: '9', title: 'NLP Document Processing', account: 'MetricPulse AI', stage: 'qualification', owner: 'Anna Kim', createdAt: '5 days ago', description: 'Automated document processing using NLP models.', value: '$175K' },
  { id: '10', title: 'Data Migration to Cloud', account: 'MetricPulse AI', stage: 'closed_lost', owner: 'Anna Kim', createdAt: '1 month ago', description: 'Legacy on-prem to cloud data migration project.', value: '$90K' },
]

function StageBadge({ stage }: { stage: Stage }) {
  const config = stageConfig[stage]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.color} ${config.borderColor}`}>
      {stage === 'closed_won' ? <CheckCircle2 className="w-3 h-3" /> :
       stage === 'closed_lost' ? <AlertCircle className="w-3 h-3" /> :
       stage === 'poc' ? <ArrowUpRight className="w-3 h-3" /> :
       <Clock className="w-3 h-3" />}
      {config.label}
    </span>
  )
}

function StageColumnView({ filteredUseCases }: { filteredUseCases: UseCase[] }) {
  const stages: Stage[] = ['discovery', 'qualification', 'poc', 'negotiation', 'closed_won', 'closed_lost']

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {stages.map((stage) => {
        const casesInStage = filteredUseCases.filter((uc) => uc.stage === stage)
        const config = stageConfig[stage]
        return (
          <div key={stage} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${config.color}`}>{config.label}</h3>
              <span className="text-xs text-gray-500 bg-dark-50 px-2 py-0.5 rounded-full">{casesInStage.length}</span>
            </div>
            <div className="space-y-2">
              {casesInStage.map((uc) => (
                <motion.div
                  key={uc.id}
                  whileHover={{ scale: 1.02 }}
                  className="p-3 glass-card rounded-xl cursor-pointer hover:border-white/10 transition-all"
                >
                  <h4 className="text-sm font-medium text-white mb-1 truncate">{uc.title}</h4>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                    <Building2 className="w-3 h-3" />
                    {uc.account}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{uc.value}</span>
                    <span className="text-xs text-gray-500">{uc.createdAt}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ListView({ filteredUseCases }: { filteredUseCases: UseCase[] }) {
  return (
    <div className="space-y-3">
      {filteredUseCases.map((uc, i) => (
        <motion.div
          key={uc.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="!p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-sm font-semibold text-white truncate">{uc.title}</h3>
                  <StageBadge stage={uc.stage} />
                </div>
                <p className="text-xs text-gray-400 truncate">{uc.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {uc.account}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {uc.owner}
                  </span>
                  <span>{uc.value}</span>
                  <span>{uc.createdAt}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

export function UseCasesPage() {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all')

  const filteredUseCases = useCases.filter((uc) => {
    const matchesSearch = uc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      uc.account.toLowerCase().includes(searchQuery.toLowerCase()) ||
      uc.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStage = stageFilter === 'all' || uc.stage === stageFilter
    return matchesSearch && matchesStage
  })

  // Stage summary counts
  const stageCounts = Object.entries(stageConfig).map(([key, config]) => ({
    stage: key as Stage,
    label: config.label,
    count: useCases.filter((uc) => uc.stage === key).length,
    color: config.color,
    bgColor: config.bgColor,
  }))

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 lg:p-8 space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Use Cases</h1>
          <p className="text-gray-400 mt-1">Track and manage use cases across your accounts.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Use Case
        </button>
      </motion.div>

      {/* Stage Summary */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stageCounts.map((s) => (
          <button
            key={s.stage}
            onClick={() => setStageFilter(stageFilter === s.stage ? 'all' : s.stage)}
            className={`p-4 rounded-xl border transition-all ${
              stageFilter === s.stage
                ? `${s.bgColor} border-white/20`
                : 'border-white/5 hover:border-white/10 bg-dark-100/50'
            }`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </button>
        ))}
      </motion.div>

      {/* Controls */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search use cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <div className="flex bg-dark-100/50 rounded-lg border border-white/5 p-0.5">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'board' ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-white'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-white'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div variants={itemVariants}>
        {viewMode === 'board' ? (
          <StageColumnView filteredUseCases={filteredUseCases} />
        ) : (
          <ListView filteredUseCases={filteredUseCases} />
        )}
      </motion.div>
    </motion.div>
  )
}
