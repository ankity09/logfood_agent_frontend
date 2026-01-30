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
  Sparkles,
  Copy,
  Check,
  CalendarClock,
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
  goLiveDate: string | null
}

const stageConfig: Record<Stage, { label: string; color: string; bgColor: string; borderColor: string; fillColor: string; order: number }> = {
  validating: { label: 'Validating', color: 'text-neon-blue', bgColor: 'bg-neon-blue/10', borderColor: 'border-neon-blue/20', fillColor: 'bg-neon-blue/40', order: 1 },
  scoping: { label: 'Scoping', color: 'text-neon-purple', bgColor: 'bg-neon-purple/10', borderColor: 'border-neon-purple/20', fillColor: 'bg-neon-purple/40', order: 2 },
  evaluating: { label: 'Evaluating', color: 'text-yellow-400', bgColor: 'bg-yellow-400/10', borderColor: 'border-yellow-400/20', fillColor: 'bg-yellow-400/40', order: 3 },
  confirming: { label: 'Confirming', color: 'text-neon-pink', bgColor: 'bg-neon-pink/10', borderColor: 'border-neon-pink/20', fillColor: 'bg-neon-pink/40', order: 4 },
  onboarding: { label: 'Onboarding', color: 'text-primary', bgColor: 'bg-primary/10', borderColor: 'border-primary/20', fillColor: 'bg-primary/40', order: 5 },
  live: { label: 'Live', color: 'text-green-400', bgColor: 'bg-green-400/10', borderColor: 'border-green-400/20', fillColor: 'bg-green-400/40', order: 6 },
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

// Go-Live time bucket configuration
type GoLiveBucket = 'overdue' | 'thisWeek' | 'nextWeek' | 'thisMonth' | 'later'

const goLiveBucketConfig: Record<GoLiveBucket, {
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: string
}> = {
  overdue: {
    label: 'Overdue',
    color: 'text-neon-pink',
    bgColor: 'bg-neon-pink/10',
    borderColor: 'border-neon-pink/30',
    icon: '🚨'
  },
  thisWeek: {
    label: 'This Week',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/30',
    icon: '⚡'
  },
  nextWeek: {
    label: 'Next Week',
    color: 'text-neon-blue',
    bgColor: 'bg-neon-blue/10',
    borderColor: 'border-neon-blue/30',
    icon: '📅'
  },
  thisMonth: {
    label: 'This Month',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    icon: '✓'
  },
  later: {
    label: 'Later',
    color: 'text-theme-secondary',
    bgColor: 'bg-theme-elevated',
    borderColor: 'border-theme',
    icon: '📆'
  },
}

function getGoLiveBucket(goLiveDate: string | null): GoLiveBucket {
  if (!goLiveDate) return 'later'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const goLive = new Date(goLiveDate)
  goLive.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((goLive.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'overdue'
  if (diffDays <= 7) return 'thisWeek'
  if (diffDays <= 14) return 'nextWeek'
  if (diffDays <= 30) return 'thisMonth'
  return 'later'
}

function getDaysUntilGoLive(goLiveDate: string | null): { days: number; label: string } {
  if (!goLiveDate) return { days: Infinity, label: 'No date' }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const goLive = new Date(goLiveDate)
  goLive.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((goLive.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { days: diffDays, label: `${Math.abs(diffDays)}d overdue` }
  } else if (diffDays === 0) {
    return { days: 0, label: 'Today!' }
  } else if (diffDays === 1) {
    return { days: 1, label: 'Tomorrow' }
  } else if (diffDays <= 7) {
    return { days: diffDays, label: `${diffDays}d` }
  } else if (diffDays <= 30) {
    const weeks = Math.ceil(diffDays / 7)
    return { days: diffDays, label: `${weeks}w` }
  } else {
    const months = Math.ceil(diffDays / 30)
    return { days: diffDays, label: `${months}mo` }
  }
}

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

async function generateUpdate(rawNotes: string, useCaseContext: Record<string, unknown>): Promise<string> {
  const url = `${databricksConfig.api.baseUrl}${databricksConfig.api.generateUpdateEndpoint}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawNotes, useCaseContext }),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    const detail = errBody.details || errBody.error || `HTTP ${res.status}`
    throw new Error(detail)
  }
  const data = await res.json()
  return data.update
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

// --- Formatted Description ---
function FormattedDescription({ text }: { text: string }) {
  if (!text) return <p className="text-sm text-theme-muted italic">No description</p>

  const lines = text.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="h-2" />
        // Detect numbered section headers like "1. Project Summary" or "2. Current Status"
        if (/^\d+\.\s+[A-Z]/.test(trimmed)) {
          return (
            <p key={i} className="text-sm text-theme-primary font-semibold mt-3 first:mt-0">
              {trimmed}
            </p>
          )
        }
        return (
          <p key={i} className="text-sm text-theme-secondary leading-relaxed">
            {trimmed}
          </p>
        )
      })}
    </div>
  )
}

// --- Next Steps Log ---
const NEXT_STEP_DATE_RE = /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+([A-Z]{1,4})\s*[-–]\s*/

function NextStepsLog({ steps }: { steps: string[] }) {
  if (!steps || steps.length === 0) {
    return <p className="text-sm text-theme-muted italic">No updates yet</p>
  }

  return (
    <div className="space-y-2.5">
      {steps.map((step, i) => {
        const match = step.match(NEXT_STEP_DATE_RE)
        if (match) {
          const date = match[1]
          const initials = match[2]
          const body = step.slice(match[0].length)
          return (
            <div key={i} className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5 flex flex-col items-center">
                <span className="text-[10px] text-theme-muted font-mono">{date}</span>
                <span className="text-[10px] text-primary font-semibold mt-0.5">{initials}</span>
              </div>
              <p className="text-sm text-theme-secondary leading-relaxed">{body}</p>
            </div>
          )
        }
        // Fallback: plain bullet
        return (
          <div key={i} className="flex items-start gap-2">
            <span className="text-primary mt-0.5 shrink-0">-</span>
            <p className="text-sm text-theme-secondary">{step}</p>
          </div>
        )
      })}
    </div>
  )
}

// --- Update Generator ---
function UpdateGenerator({ useCase }: { useCase: UseCase }) {
  const [isOpen, setIsOpen] = useState(false)
  const [rawNotes, setRawNotes] = useState('')
  const [generatedUpdate, setGeneratedUpdate] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!rawNotes.trim()) return
    setIsGenerating(true)
    setGenError(null)
    setGeneratedUpdate('')
    try {
      const result = await generateUpdate(rawNotes, {
        title: useCase.title,
        account: useCase.account,
        stage: useCase.stage,
        value: useCase.value,
        owner: useCase.owner,
        stakeholders: useCase.stakeholders,
        databricksServices: useCase.databricksServices,
        goLiveDate: useCase.goLiveDate,
        description: useCase.description,
        nextSteps: useCase.nextSteps,
      })
      setGeneratedUpdate(result)
    } catch (err) {
      console.error('Generate update error:', err)
      setGenError(err instanceof Error ? err.message : 'Failed to generate update. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUpdate)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl overflow-hidden bg-gradient-to-r from-neon-purple/20 via-primary/20 to-neon-purple/20 p-[1px]">
      <div className="bg-theme-card rounded-xl overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-theme-subtle transition-colors bg-gradient-to-r from-neon-purple/10 via-transparent to-primary/10"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-neon-purple to-primary">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-theme-primary">Generate Salesforce Update</span>
              <p className="text-xs text-theme-secondary mt-0.5">AI-powered update from your notes</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-neon-purple transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3 border-t border-theme">
                <textarea
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                  placeholder="Paste your raw meeting notes or observations here..."
                  className="w-full h-28 bg-theme-elevated border border-theme rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-theme-muted resize-none focus:outline-none focus:border-neon-purple/50 mt-3"
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !rawNotes.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all bg-gradient-to-r from-neon-purple to-primary text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-neon-purple/20"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Update
                    </>
                  )}
                </button>

                {genError && (
                  <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{genError}</p>
                )}

                {generatedUpdate && (
                  <div className="space-y-2 pt-2">
                    <label className="text-xs text-theme-secondary font-medium">Generated Update (editable):</label>
                    <textarea
                      value={generatedUpdate}
                      onChange={(e) => setGeneratedUpdate(e.target.value)}
                      className="w-full h-28 bg-theme-elevated border border-neon-purple/30 rounded-lg px-3 py-2 text-sm text-theme-primary resize-none focus:outline-none focus:border-neon-purple/50"
                    />
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-primary/10 text-theme-primary hover:bg-primary/20 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy to Clipboard
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
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

      {/* Modal - Extra Large */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        className="relative w-full max-w-6xl mx-4 bg-theme-card border border-theme rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-theme">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-theme-primary">{useCase.title}</h2>
              <div className="flex items-center gap-3 mt-2">
                <StageBadge stage={useCase.stage} />
                <span className="text-sm text-theme-secondary">{useCase.value}</span>
                <span className="text-sm text-theme-muted">•</span>
                <span className="text-sm text-theme-secondary flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {useCase.account}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Two Column Layout */}
        <div className="p-6 max-h-[80vh] overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - AI Generator & Next Steps */}
            <div className="space-y-6">
              {/* AI Update Generator - Now at the top */}
              <UpdateGenerator useCase={useCase} />

              {/* Next Steps / Updates */}
              <div>
                <h4 className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-3">Next Steps / Updates</h4>
                <div className="bg-theme-elevated rounded-xl p-4 border border-theme max-h-[300px] overflow-y-auto no-scrollbar">
                  <NextStepsLog steps={useCase.nextSteps} />
                </div>
              </div>
            </div>

            {/* Right Column - Details & Description */}
            <div className="space-y-6">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-theme-elevated rounded-xl p-4 border border-theme">
                  <h4 className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-2">Owner</h4>
                  <p className="text-sm text-theme-primary flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-theme-secondary" />
                    {useCase.owner}
                  </p>
                </div>
                <div className="bg-theme-elevated rounded-xl p-4 border border-theme">
                  <h4 className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-2">Target Go-Live</h4>
                  <p className="text-sm text-theme-primary flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4 text-theme-secondary" />
                    {useCase.goLiveDate
                      ? new Date(useCase.goLiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Not set'}
                  </p>
                </div>
              </div>

              {/* Databricks Services */}
              <div>
                <h4 className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-2">Databricks Services</h4>
                <div className="flex flex-wrap gap-2">
                  {(useCase.databricksServices || []).map((svc) => (
                    <ServiceBadge key={svc} service={svc} />
                  ))}
                </div>
              </div>

              {/* Stage Progress */}
              <div>
                <h4 className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-2">Stage Progress</h4>
                <div className="flex gap-1">
                  {Object.entries(stageConfig)
                    .sort(([, a], [, b]) => a.order - b.order)
                    .map(([key, cfg]) => (
                      <div
                        key={key}
                        className={`flex-1 h-2.5 rounded-full transition-colors ${
                          cfg.order <= stgConfig.order ? stgConfig.fillColor : 'bg-theme-elevated border border-theme'
                        }`}
                        title={cfg.label}
                      />
                    ))}
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-theme-muted">Validating</span>
                  <span className="text-xs text-theme-muted">Live</span>
                </div>
              </div>

              {/* Stakeholders */}
              <div>
                <h4 className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-2">Stakeholders</h4>
                <div className="flex flex-wrap gap-2">
                  {(useCase.stakeholders || []).map((s, i) => (
                    <span key={i} className="text-sm bg-theme-elevated text-theme-secondary px-3 py-1.5 rounded-lg border border-theme">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description - Now at the bottom */}
              <div>
                <h4 className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-2">Description</h4>
                <div className="bg-theme-elevated rounded-xl p-4 border border-theme">
                  <FormattedDescription text={useCase.description} />
                </div>
              </div>
            </div>
          </div>

          {/* Meta - Full Width Footer */}
          <div className="flex items-center gap-4 pt-4 mt-6 border-t border-theme text-xs text-theme-muted">
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
          <h4 className="text-sm font-medium text-theme-primary">Filters</h4>
          {hasFilters && (
            <button onClick={onClear} className="text-xs text-theme-secondary hover:text-theme-primary transition-colors">
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Stage Filter */}
          <div>
            <label className="block text-xs text-theme-muted mb-1.5">Stage</label>
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
            <label className="block text-xs text-theme-muted mb-1.5">Databricks Service</label>
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
            <label className="block text-xs text-theme-muted mb-1.5">Date Created</label>
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
              <span className="text-xs text-theme-muted bg-theme-elevated px-2 py-0.5 rounded-full border border-theme">{casesInStage.length}</span>
            </div>
            <div className="space-y-2">
              {casesInStage.map((uc) => (
                <motion.div
                  key={uc.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => onSelect(uc)}
                  className="p-3 glass-card rounded-xl cursor-pointer hover:border-primary/20 transition-all"
                >
                  <h4 className="text-sm font-medium text-theme-primary mb-1 truncate">{uc.title}</h4>
                  <p className="text-xs text-theme-secondary flex items-center gap-1 mb-2">
                    <Building2 className="w-3 h-3" />
                    {uc.account}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(uc.databricksServices || []).map((svc) => (
                      <span key={svc} className={`text-[10px] px-1.5 py-0.5 rounded border ${serviceColors[svc]}`}>
                        {svc}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-theme-muted">{uc.value}</span>
                    <span className="text-xs text-theme-muted">
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
                  <h3 className="text-sm font-semibold text-theme-primary truncate">{uc.title}</h3>
                  <StageBadge stage={uc.stage} />
                </div>
                <p className="text-xs text-theme-secondary truncate">{uc.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-theme-muted">
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
                    {(uc.databricksServices || []).join(', ')}
                  </span>
                  <span>{uc.value}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-theme-secondary shrink-0" />
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

// --- Go-Live Countdown Badge ---
function GoLiveCountdown({ goLiveDate }: { goLiveDate: string | null }) {
  const bucket = getGoLiveBucket(goLiveDate)
  const { label } = getDaysUntilGoLive(goLiveDate)
  const config = goLiveBucketConfig[bucket]

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${config.bgColor} ${config.color} border ${config.borderColor}`}>
      <CalendarClock className="w-3 h-3" />
      {label}
    </span>
  )
}

// --- Go-Live View ---
function GoLiveView({ filteredUseCases, onSelect }: { filteredUseCases: UseCase[]; onSelect: (uc: UseCase) => void }) {
  const buckets: GoLiveBucket[] = ['overdue', 'thisWeek', 'nextWeek', 'thisMonth', 'later']
  const safeUseCases = filteredUseCases || []

  // Group use cases by bucket and sort by date within each bucket
  const groupedUseCases = buckets.reduce((acc, bucket) => {
    acc[bucket] = safeUseCases
      .filter((uc) => getGoLiveBucket(uc.goLiveDate) === bucket)
      .sort((a, b) => {
        if (!a.goLiveDate) return 1
        if (!b.goLiveDate) return -1
        return new Date(a.goLiveDate).getTime() - new Date(b.goLiveDate).getTime()
      })
    return acc
  }, {} as Record<GoLiveBucket, UseCase[]>)

  const totalWithDates = safeUseCases.filter(uc => uc.goLiveDate).length
  const overdueCount = groupedUseCases.overdue.length
  const thisWeekCount = groupedUseCases.thisWeek.length

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-4 rounded-xl border ${goLiveBucketConfig.overdue.bgColor} ${goLiveBucketConfig.overdue.borderColor}`}>
          <p className={`text-2xl font-bold ${goLiveBucketConfig.overdue.color}`}>{overdueCount}</p>
          <p className="text-xs text-theme-secondary mt-1">Overdue</p>
        </div>
        <div className={`p-4 rounded-xl border ${goLiveBucketConfig.thisWeek.bgColor} ${goLiveBucketConfig.thisWeek.borderColor}`}>
          <p className={`text-2xl font-bold ${goLiveBucketConfig.thisWeek.color}`}>{thisWeekCount}</p>
          <p className="text-xs text-theme-secondary mt-1">This Week</p>
        </div>
        <div className={`p-4 rounded-xl border ${goLiveBucketConfig.thisMonth.bgColor} ${goLiveBucketConfig.thisMonth.borderColor}`}>
          <p className={`text-2xl font-bold ${goLiveBucketConfig.thisMonth.color}`}>{groupedUseCases.thisMonth.length}</p>
          <p className="text-xs text-theme-secondary mt-1">This Month</p>
        </div>
        <div className="p-4 rounded-xl border border-theme bg-theme-card">
          <p className="text-2xl font-bold text-theme-primary">{totalWithDates}</p>
          <p className="text-xs text-theme-secondary mt-1">Total Scheduled</p>
        </div>
      </div>

      {/* Bucket Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {buckets.map((bucket) => {
          const casesInBucket = groupedUseCases[bucket]
          const config = goLiveBucketConfig[bucket]

          return (
            <div key={bucket} className="space-y-3">
              <div className={`flex items-center justify-between p-3 rounded-xl ${config.bgColor} border ${config.borderColor}`}>
                <h3 className={`text-sm font-semibold ${config.color} flex items-center gap-2`}>
                  <span>{config.icon}</span>
                  {config.label}
                </h3>
                <span className={`text-xs font-bold ${config.color} bg-white/10 px-2 py-0.5 rounded-full`}>
                  {casesInBucket.length}
                </span>
              </div>

              <div className="space-y-2">
                {casesInBucket.length === 0 ? (
                  <p className="text-xs text-theme-muted text-center py-4 italic">No use cases</p>
                ) : (
                  casesInBucket.map((uc) => (
                    <motion.div
                      key={uc.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => onSelect(uc)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${config.borderColor} bg-theme-card hover:bg-theme-elevated`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-medium text-theme-primary truncate flex-1">{uc.title}</h4>
                        <GoLiveCountdown goLiveDate={uc.goLiveDate} />
                      </div>
                      <p className="text-xs text-theme-secondary flex items-center gap-1 mb-2">
                        <Building2 className="w-3 h-3" />
                        {uc.account}
                      </p>
                      <div className="flex items-center justify-between">
                        <StageBadge stage={uc.stage} />
                        <span className="text-xs text-theme-muted">
                          {uc.goLiveDate
                            ? new Date(uc.goLiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : 'No date'}
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --- Main Page ---
export function UseCasesPage() {
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'golive'>('board')
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
          <h1 className="text-3xl font-bold text-theme-primary">Use Cases</h1>
          <p className="text-theme-secondary mt-1">Track and manage use cases across your accounts.</p>
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
                ? `${s.bgColor} border-primary/30`
                : 'border-theme hover:border-primary/20 bg-theme-card'
            }`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-theme-secondary mt-1">{s.label}</p>
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
          <div className="flex bg-theme-elevated rounded-lg border border-theme p-0.5">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'board' ? 'bg-primary/20 text-primary' : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('golive')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                viewMode === 'golive' ? 'bg-primary/20 text-primary' : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              <Rocket className="w-3 h-3" />
              Go-Live
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
            <p className="text-theme-secondary">Loading use cases...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <Target className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
            <p className="text-red-400 text-lg">{error}</p>
            <button onClick={loadUseCases} className="btn-ghost mt-4 text-sm">Retry</button>
          </div>
        ) : filteredUseCases.length === 0 ? (
          <div className="text-center py-16">
            <Target className="w-12 h-12 text-theme-muted mx-auto mb-4" />
            <p className="text-theme-secondary text-lg">No use cases match your filters</p>
            <p className="text-theme-muted text-sm mt-1">Try adjusting your search or filter criteria</p>
            <button onClick={clearFilters} className="btn-ghost mt-4 text-sm">Clear all filters</button>
          </div>
        ) : viewMode === 'board' ? (
          <StageColumnView filteredUseCases={filteredUseCases} onSelect={setSelectedUseCase} />
        ) : viewMode === 'golive' ? (
          <GoLiveView filteredUseCases={filteredUseCases} onSelect={setSelectedUseCase} />
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
