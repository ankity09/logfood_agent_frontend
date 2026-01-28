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
  if (!text) return <p className="text-sm text-gray-500 italic">No description</p>

  const lines = text.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="h-2" />
        // Detect numbered section headers like "1. Project Summary" or "2. Current Status"
        if (/^\d+\.\s+[A-Z]/.test(trimmed)) {
          return (
            <p key={i} className="text-sm text-white font-semibold mt-3 first:mt-0">
              {trimmed}
            </p>
          )
        }
        return (
          <p key={i} className="text-sm text-gray-300 leading-relaxed">
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
    return <p className="text-sm text-gray-500 italic">No updates yet</p>
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
                <span className="text-[10px] text-gray-500 font-mono">{date}</span>
                <span className="text-[10px] text-primary font-semibold mt-0.5">{initials}</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{body}</p>
            </div>
          )
        }
        // Fallback: plain bullet
        return (
          <div key={i} className="flex items-start gap-2">
            <span className="text-primary mt-0.5 shrink-0">-</span>
            <p className="text-sm text-gray-300">{step}</p>
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
      <div className="bg-dark-100 rounded-xl overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors bg-gradient-to-r from-neon-purple/10 via-transparent to-primary/10"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-neon-purple to-primary">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-white">Generate Salesforce Update</span>
              <p className="text-xs text-gray-400 mt-0.5">AI-powered update from your notes</p>
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
              <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                <textarea
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                  placeholder="Paste your raw meeting notes or observations here..."
                  className="w-full h-28 bg-dark-50 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-neon-purple/50 mt-3"
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
                    <label className="text-xs text-gray-400 font-medium">Generated Update (editable):</label>
                    <textarea
                      value={generatedUpdate}
                      onChange={(e) => setGeneratedUpdate(e.target.value)}
                      className="w-full h-28 bg-dark-50 border border-neon-purple/30 rounded-lg px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-neon-purple/50"
                    />
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-white/10 text-white hover:bg-white/15 transition-colors"
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
        className="relative w-full max-w-6xl mx-4 bg-dark-100 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{useCase.title}</h2>
              <div className="flex items-center gap-3 mt-2">
                <StageBadge stage={useCase.stage} />
                <span className="text-sm text-gray-400">{useCase.value}</span>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {useCase.account}
                </span>
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

        {/* Body - Two Column Layout */}
        <div className="p-6 max-h-[80vh] overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - AI Generator & Next Steps */}
            <div className="space-y-6">
              {/* AI Update Generator - Now at the top */}
              <UpdateGenerator useCase={useCase} />

              {/* Next Steps / Updates */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Next Steps / Updates</h4>
                <div className="bg-dark-50/50 rounded-xl p-4 border border-white/5 max-h-[300px] overflow-y-auto no-scrollbar">
                  <NextStepsLog steps={useCase.nextSteps} />
                </div>
              </div>
            </div>

            {/* Right Column - Details & Description */}
            <div className="space-y-6">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-dark-50/50 rounded-xl p-4 border border-white/5">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Owner</h4>
                  <p className="text-sm text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-gray-400" />
                    {useCase.owner}
                  </p>
                </div>
                <div className="bg-dark-50/50 rounded-xl p-4 border border-white/5">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Target Go-Live</h4>
                  <p className="text-sm text-white flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4 text-gray-400" />
                    {useCase.goLiveDate
                      ? new Date(useCase.goLiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Not set'}
                  </p>
                </div>
              </div>

              {/* Databricks Services */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Databricks Services</h4>
                <div className="flex flex-wrap gap-2">
                  {(useCase.databricksServices || []).map((svc) => (
                    <ServiceBadge key={svc} service={svc} />
                  ))}
                </div>
              </div>

              {/* Stage Progress */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Stage Progress</h4>
                <div className="flex gap-1">
                  {Object.entries(stageConfig)
                    .sort(([, a], [, b]) => a.order - b.order)
                    .map(([key, cfg]) => (
                      <div
                        key={key}
                        className={`flex-1 h-2.5 rounded-full transition-colors ${
                          cfg.order <= stgConfig.order ? stgConfig.fillColor : 'bg-dark-50'
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
                  {(useCase.stakeholders || []).map((s, i) => (
                    <span key={i} className="text-sm bg-dark-50 text-gray-300 px-3 py-1.5 rounded-lg border border-white/5">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description - Now at the bottom */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                <div className="bg-dark-50/50 rounded-xl p-4 border border-white/5">
                  <FormattedDescription text={useCase.description} />
                </div>
              </div>
            </div>
          </div>

          {/* Meta - Full Width Footer */}
          <div className="flex items-center gap-4 pt-4 mt-6 border-t border-white/5 text-xs text-gray-500">
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
                    {(uc.databricksServices || []).map((svc) => (
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
                    {(uc.databricksServices || []).join(', ')}
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
