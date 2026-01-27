import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  Plus,
  Search,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Rocket,
  ChevronRight,
  Users,
  Building2,
  X,
  Calendar,
  Server,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { Card } from '../ui/Card'
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

type Stage = 'validating' | 'scoping' | 'evaluating' | 'confirming' | 'onboarding' | 'live'

type DatabricksService = 'AI/BI' | 'DBSQL' | 'Unity Catalog' | 'AI/ML'

interface UseCase {
  id: string
  title: string
  account: string
  stage: Stage
  owner: string
  createdAt: string
  description: string
  value: string
  databricksServices: DatabricksService[]
  nextSteps: string[]
  stakeholders: string[]
}

const stageConfig: Record<Stage, { label: string; color: string; bgColor: string; borderColor: string; order: number }> = {
  validating: { label: 'Validating', color: 'text-neon-blue', bgColor: 'bg-neon-blue/10', borderColor: 'border-neon-blue/20', order: 1 },
  scoping: { label: 'Scoping', color: 'text-neon-purple', bgColor: 'bg-neon-purple/10', borderColor: 'border-neon-purple/20', order: 2 },
  evaluating: { label: 'Evaluating', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10', borderColor: 'border-yellow-400/20', order: 3 },
  confirming: { label: 'Confirming', color: 'text-neon-pink', bgColor: 'bg-neon-pink/10', borderColor: 'border-neon-pink/20', order: 4 },
  onboarding: { label: 'Onboarding', color: 'text-primary', bgColor: 'bg-primary/10', borderColor: 'border-primary/20', order: 5 },
  live: { label: 'Live', color: 'text-green-400', bgColor: 'bg-green-400/10', borderColor: 'border-green-400/20', order: 6 },
}

const allServices: DatabricksService[] = ['AI/BI', 'DBSQL', 'Unity Catalog', 'AI/ML']

const serviceColors: Record<DatabricksService, string> = {
  'AI/BI': 'bg-neon-blue/10 text-neon-blue border-neon-blue/20',
  'DBSQL': 'bg-neon-purple/10 text-neon-purple border-neon-purple/20',
  'Unity Catalog': 'bg-primary/10 text-primary border-primary/20',
  'AI/ML': 'bg-neon-pink/10 text-neon-pink border-neon-pink/20',
}

const dateFilterOptions = [
  { label: 'All Time', value: 'all' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
] as const

type DateFilter = typeof dateFilterOptions[number]['value']

async function fetchUseCases(params?: {
  stage?: string
  service?: string
  date?: string
  search?: string
}): Promise<UseCase[]> {
  const query = new URLSearchParams()
  if (params?.stage && params.stage !== 'all') query.set('stage', params.stage)
  if (params?.service && params.service !== 'all') query.set('service', params.service)
  if (params?.date && params.date !== 'all') query.set('date', params.date)
  if (params?.search) query.set('search', params.search)

  const qs = query.toString()
  const url = `${databricksConfig.api.baseUrl}${databricksConfig.api.useCasesEndpoint}${qs ? `?${qs}` : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch use cases: ${res.status}`)
  return res.json()
}

function StageBadge({ stage }: { stage: Stage }) {
  const config = stageConfig[stage]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.color} ${config.borderColor}`}>
      {stage === 'live' ? <CheckCircle2 className="w-3 h-3" /> :
       stage === 'onboarding' ? <Rocket className="w-3 h-3" /> :
       stage === 'evaluating' ? <ArrowUpRight className="w-3 h-3" /> :
       <Clock className="w-3 h-3" />}
      {config.label}
    </span>
  )
}

function ServiceBadge({ service }: { service: DatabricksService }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${serviceColors[service]}`}>
      {service}
    </span>
  )
}

// --- Detail Modal ---
function UseCaseDetailModal({ useCase, onClose }: { useCase: UseCase; onClose: () => void }) {
  const stgConfig = stageConfig[useCase.stage]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        className="relative w-full max-w-lg bg-dark-100 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{useCase.title}</h2>
              <div className="flex items-center gap-2 mt-2">
                <StageBadge stage={useCase.stage} />
                <span className="text-xs text-gray-500">{useCase.value}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto no-scrollbar">
          {/* Description */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Description</h4>
            <p className="text-sm text-gray-300 leading-relaxed">{useCase.description}</p>
          </div>

          {/* Account & Owner */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Account</h4>
              <p className="text-sm text-white flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                {useCase.account}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Owner</h4>
              <p className="text-sm text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                {useCase.owner}
              </p>
            </div>
          </div>

          {/* Databricks Services */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Databricks Services</h4>
            <div className="flex flex-wrap gap-2">
              {useCase.databricksServices.map((svc) => (
                <ServiceBadge key={svc} service={svc} />
              ))}
            </div>
          </div>

          {/* Stage Info */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Stage Progress</h4>
            <div className="flex gap-1">
              {Object.entries(stageConfig)
                .sort(([, a], [, b]) => a.order - b.order)
                .map(([key, cfg]) => (
                  <div
                    key={key}
                    className={`flex-1 h-2 rounded-full transition-colors ${
                      cfg.order <= stgConfig.order ? stgConfig.bgColor.replace('/10', '/40') : 'bg-dark-50'
                    }`}
                    title={cfg.label}
                  />
                ))}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-gray-500">Validating</span>
              <span className="text-xs text-gray-500">Live</span>
            </div>
          </div>

          {/* Stakeholders */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Stakeholders</h4>
            <div className="flex flex-wrap gap-2">
              {useCase.stakeholders.map((s, i) => (
                <span key={i} className="text-xs bg-dark-50 text-gray-300 px-2.5 py-1 rounded-lg border border-white/5">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Next Steps</h4>
            <ul className="space-y-1.5">
              {useCase.nextSteps.map((step, i) => (
                <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">-</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 pt-3 border-t border-white/5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Created: {new Date(useCase.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// --- Filter Panel ---
function FilterPanel({
  stageFilter, setStageFilter,
  serviceFilter, setServiceFilter,
  dateFilter, setDateFilter,
  onClear,
}: {
  stageFilter: Stage | 'all'
  setStageFilter: (v: Stage | 'all') => void
  serviceFilter: DatabricksService | 'all'
  setServiceFilter: (v: DatabricksService | 'all') => void
  dateFilter: DateFilter
  setDateFilter: (v: DateFilter) => void
  onClear: () => void
}) {
  const hasFilters = stageFilter !== 'all' || serviceFilter !== 'all' || dateFilter !== 'all'

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white">Filters</h4>
          {hasFilters && (
            <button onClick={onClear} className="text-xs text-gray-400 hover:text-white transition-colors">
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Stage Filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Stage</label>
            <div className="relative">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as Stage | 'all')}
                className="input text-sm appearance-none pr-8 cursor-pointer"
              >
                <option value="all">All Stages</option>
                {Object.entries(stageConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Service Filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Databricks Service</label>
            <div className="relative">
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value as DatabricksService | 'all')}
                className="input text-sm appearance-none pr-8 cursor-pointer"
              >
                <option value="all">All Services</option>
                {allServices.map((svc) => (
                  <option key={svc} value={svc}>{svc}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Date Created</label>
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="input text-sm appearance-none pr-8 cursor-pointer"
              >
                {dateFilterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// --- Board View ---
function StageColumnView({ filteredUseCases, onSelect }: { filteredUseCases: UseCase[]; onSelect: (uc: UseCase) => void }) {
  const stages: Stage[] = ['validating', 'scoping', 'evaluating', 'confirming', 'onboarding', 'live']

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
                  onClick={() => onSelect(uc)}
                  className="p-3 glass-card rounded-xl cursor-pointer hover:border-white/10 transition-all"
                >
                  <h4 className="text-sm font-medium text-white mb-1 truncate">{uc.title}</h4>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                    <Building2 className="w-3 h-3" />
                    {uc.account}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {uc.databricksServices.map((svc) => (
                      <span key={svc} className={`text-[10px] px-1.5 py-0.5 rounded border ${serviceColors[svc]}`}>
                        {svc}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{uc.value}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(uc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
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

// --- List View ---
function ListView({ filteredUseCases, onSelect }: { filteredUseCases: UseCase[]; onSelect: (uc: UseCase) => void }) {
  return (
    <div className="space-y-3">
      {filteredUseCases.map((uc, i) => (
        <motion.div
          key={uc.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(uc)}
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
                  <span className="flex items-center gap-1">
                    <Server className="w-3 h-3" />
                    {uc.databricksServices.join(', ')}
                  </span>
                  <span>{uc.value}</span>
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

// --- Main Page ---
export function UseCasesPage() {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all')
  const [serviceFilter, setServiceFilter] = useState<DatabricksService | 'all'>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null)
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUseCases = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchUseCases({
        stage: stageFilter,
        service: serviceFilter,
        date: dateFilter,
        search: searchQuery || undefined,
      })
      setUseCases(data)
    } catch (err) {
      console.error('Failed to load use cases:', err)
      setError('Failed to load use cases. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [stageFilter, serviceFilter, dateFilter, searchQuery])

  useEffect(() => {
    loadUseCases()
  }, [loadUseCases])

  // Client-side search still applies for instant filtering
  // (server also filters, but we keep client filtering for responsiveness)
  const filteredUseCases = useCases.filter((uc) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      uc.title.toLowerCase().includes(q) ||
      uc.account.toLowerCase().includes(q) ||
      uc.description.toLowerCase().includes(q)
    )
  })

  const stageCounts = Object.entries(stageConfig).map(([key, config]) => ({
    stage: key as Stage,
    label: config.label,
    count: useCases.filter((uc) => uc.stage === key).length,
    color: config.color,
    bgColor: config.bgColor,
  }))

  const activeFilterCount = [stageFilter !== 'all', serviceFilter !== 'all', dateFilter !== 'all'].filter(Boolean).length

  const clearFilters = () => {
    setStageFilter('all')
    setServiceFilter('all')
    setDateFilter('all')
  }

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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-ghost flex items-center gap-2 text-sm ${showFilters ? 'text-primary' : ''}`}
          >
            <Server className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-dark text-xs flex items-center justify-center font-semibold">
                {activeFilterCount}
              </span>
            )}
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

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <FilterPanel
            stageFilter={stageFilter}
            setStageFilter={setStageFilter}
            serviceFilter={serviceFilter}
            setServiceFilter={setServiceFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            onClear={clearFilters}
          />
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-gray-400">Loading use cases...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <Target className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
            <p className="text-red-400 text-lg">{error}</p>
            <button onClick={loadUseCases} className="btn-ghost mt-4 text-sm">Retry</button>
          </div>
        ) : filteredUseCases.length === 0 ? (
          <div className="text-center py-16">
            <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No use cases match your filters</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filter criteria</p>
            <button onClick={clearFilters} className="btn-ghost mt-4 text-sm">Clear all filters</button>
          </div>
        ) : viewMode === 'board' ? (
          <StageColumnView filteredUseCases={filteredUseCases} onSelect={setSelectedUseCase} />
        ) : (
          <ListView filteredUseCases={filteredUseCases} onSelect={setSelectedUseCase} />
        )}
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedUseCase && (
          <UseCaseDetailModal
            useCase={selectedUseCase}
            onClose={() => setSelectedUseCase(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
