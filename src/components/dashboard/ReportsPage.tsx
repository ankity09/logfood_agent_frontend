import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileBarChart,
  Plus,
  Search,
  Loader2,
  Calendar,
  Building2,
  Trash2,
  ChevronDown,
  Clock,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { databricksConfig } from '../../config'
import ReactMarkdown from 'react-markdown'

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

type ReportType = 'weekly' | 'monthly' | 'quarterly' | 'use_case_summary' | 'custom'
type Scope = 'ae' | 'account'

interface Account {
  id: string
  name: string
}

interface Report {
  id: string
  title: string
  reportType: ReportType
  scope: Scope
  accountId: string | null
  accountName: string | null
  content?: string
  prompt?: string
  generatedBy: string
  generationTimeMs: number
  createdAt: string
  updatedAt: string
}

const reportTypeConfig: Record<ReportType, { label: string; description: string; icon: string }> = {
  weekly: { label: 'Weekly Status', description: 'Key activities and priorities for the week', icon: '📊' },
  monthly: { label: 'Monthly Review', description: 'Comprehensive pipeline analysis', icon: '📈' },
  quarterly: { label: 'Quarterly Business Review', description: 'Strategic insights and trends', icon: '📋' },
  use_case_summary: { label: 'Use Case Analysis', description: 'Pipeline stage and risk analysis', icon: '🎯' },
  custom: { label: 'Custom Report', description: 'Generate based on your prompt', icon: '✨' },
}

async function fetchAccounts(): Promise<Account[]> {
  const url = `${databricksConfig.api.baseUrl}${databricksConfig.api.accountsEndpoint}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch accounts: ${res.status}`)
  return res.json()
}

async function fetchReports(): Promise<Report[]> {
  const url = `${databricksConfig.api.baseUrl}/reports`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch reports: ${res.status}`)
  return res.json()
}

async function fetchReportById(id: string): Promise<Report> {
  const url = `${databricksConfig.api.baseUrl}/reports/${id}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch report: ${res.status}`)
  return res.json()
}

async function generateReport(params: {
  reportType: ReportType
  scope: Scope
  accountId?: string
  customPrompt?: string
}): Promise<Report> {
  const url = `${databricksConfig.api.baseUrl}/reports`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Failed to generate report: ${res.status}`)
  }
  return res.json()
}

async function deleteReport(id: string): Promise<void> {
  const url = `${databricksConfig.api.baseUrl}/reports/${id}`
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete report: ${res.status}`)
}

function ReportTypeSelector({
  value,
  onChange,
}: {
  value: ReportType
  onChange: (v: ReportType) => void
}) {
  const types: ReportType[] = ['weekly', 'monthly', 'quarterly', 'use_case_summary', 'custom']

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {types.map(type => {
        const config = reportTypeConfig[type]
        const isSelected = value === type
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={`p-3 rounded-xl border transition-all text-left ${
              isSelected
                ? 'border-primary bg-primary/10'
                : 'border-theme hover:border-primary/30 bg-theme-card'
            }`}
          >
            <span className="text-xl mb-1 block">{config.icon}</span>
            <p className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-theme-primary'}`}>
              {config.label}
            </p>
          </button>
        )
      })}
    </div>
  )
}

function GenerateReportModal({
  accounts,
  onClose,
  onGenerate,
}: {
  accounts: Account[]
  onClose: () => void
  onGenerate: (report: Report) => void
}) {
  const [reportType, setReportType] = useState<ReportType>('weekly')
  const [scope, setScope] = useState<Scope>('ae')
  const [accountId, setAccountId] = useState<string>('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      const report = await generateReport({
        reportType,
        scope,
        accountId: scope === 'account' ? accountId : undefined,
        customPrompt: reportType === 'custom' ? customPrompt : undefined,
      })
      onGenerate(report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }

  const canGenerate = !isGenerating && (scope === 'ae' || (scope === 'account' && accountId))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        className="relative w-full max-w-2xl mx-4 bg-theme-card border border-theme rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-neon-purple to-primary">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-theme-primary">Generate Report</h2>
              <p className="text-xs text-theme-secondary">AI-powered insights from your data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-2">Report Type</label>
            <ReportTypeSelector value={reportType} onChange={setReportType} />
            <p className="text-xs text-theme-muted mt-2">{reportTypeConfig[reportType].description}</p>
          </div>

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-theme-primary mb-2">Scope</label>
            <div className="flex gap-2">
              <button
                onClick={() => setScope('ae')}
                className={`flex-1 px-4 py-2.5 rounded-lg border transition-all text-sm font-medium ${
                  scope === 'ae'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-theme text-theme-secondary hover:border-primary/30'
                }`}
              >
                My Portfolio (AE-level)
              </button>
              <button
                onClick={() => setScope('account')}
                className={`flex-1 px-4 py-2.5 rounded-lg border transition-all text-sm font-medium ${
                  scope === 'account'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-theme text-theme-secondary hover:border-primary/30'
                }`}
              >
                Specific Account
              </button>
            </div>
          </div>

          {/* Account Selector */}
          {scope === 'account' && (
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-2">Select Account</label>
              <div className="relative">
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="input text-sm appearance-none pr-8 cursor-pointer"
                >
                  <option value="">Choose an account...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Custom Prompt */}
          {reportType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-theme-primary mb-2">Custom Prompt</label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Describe what you'd like the report to focus on..."
                className="w-full h-24 bg-theme-elevated border border-theme rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-theme-muted resize-none focus:outline-none focus:border-primary/50"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-theme bg-theme-elevated">
          <button onClick={onClose} className="btn-ghost text-sm">
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ReportViewModal({
  report,
  onClose,
  onDelete,
}: {
  report: Report
  onClose: () => void
  onDelete: () => void
}) {
  const [fullReport, setFullReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const loadReport = async () => {
      try {
        const data = await fetchReportById(report.id)
        setFullReport(data)
      } catch (err) {
        console.error('Failed to load report:', err)
      } finally {
        setLoading(false)
      }
    }
    loadReport()
  }, [report.id])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this report?')) return
    setDeleting(true)
    try {
      await deleteReport(report.id)
      onDelete()
    } catch (err) {
      console.error('Failed to delete report:', err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
        className="relative w-full max-w-4xl mx-4 bg-theme-card border border-theme rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-theme">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              <FileBarChart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-theme-primary">{report.title}</h2>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {reportTypeConfig[report.reportType]?.label || report.reportType}
                </span>
                {report.accountName && (
                  <span className="text-xs text-theme-secondary flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {report.accountName}
                  </span>
                )}
                <span className="text-xs text-theme-muted flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(report.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-xs text-theme-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {(report.generationTimeMs / 1000).toFixed(1)}s
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-theme-secondary">Loading report...</p>
            </div>
          ) : fullReport?.content ? (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-xl font-bold text-theme-primary mt-6 mb-3 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-semibold text-theme-primary mt-5 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-medium text-theme-primary mt-4 mb-2">{children}</h3>,
                  p: ({ children }) => <p className="text-sm text-theme-secondary mb-3 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-4 text-sm text-theme-secondary">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-4 text-sm text-theme-secondary">{children}</ol>,
                  li: ({ children }) => <li className="text-theme-secondary">{children}</li>,
                  strong: ({ children }) => <strong className="text-theme-primary font-semibold">{children}</strong>,
                  table: ({ children }) => (
                    <div className="overflow-x-auto mb-4">
                      <table className="min-w-full border border-theme rounded-lg overflow-hidden">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => <th className="px-3 py-2 bg-theme-elevated text-left text-xs font-medium text-theme-primary border-b border-theme">{children}</th>,
                  td: ({ children }) => <td className="px-3 py-2 text-xs text-theme-secondary border-b border-theme">{children}</td>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary pl-4 italic text-theme-muted my-4">{children}</blockquote>
                  ),
                }}
              >
                {fullReport.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-theme-muted text-center py-8">No content available</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [reports, setReports] = useState<Report[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [reportsData, accountsData] = await Promise.all([
        fetchReports(),
        fetchAccounts(),
      ])
      setReports(reportsData)
      setAccounts(accountsData)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load reports. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleReportGenerated = (report: Report) => {
    setReports(prev => [report, ...prev])
    setShowGenerateModal(false)
    setSelectedReport(report)
  }

  const handleReportDeleted = () => {
    if (selectedReport) {
      setReports(prev => prev.filter(r => r.id !== selectedReport.id))
      setSelectedReport(null)
    }
  }

  const filteredReports = reports.filter(report => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      report.title.toLowerCase().includes(q) ||
      (report.accountName && report.accountName.toLowerCase().includes(q)) ||
      report.reportType.toLowerCase().includes(q)
    )
  })

  const reportsByType = reports.reduce((acc, r) => {
    acc[r.reportType] = (acc[r.reportType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

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
          <h1 className="text-3xl font-bold text-theme-primary">Reports</h1>
          <p className="text-theme-secondary mt-1">AI-generated insights and analysis for your accounts.</p>
        </div>
        <button onClick={() => setShowGenerateModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Generate Report
        </button>
      </motion.div>

      {/* Summary Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(['weekly', 'monthly', 'quarterly', 'use_case_summary', 'custom'] as ReportType[]).map(type => {
          const config = reportTypeConfig[type]
          const count = reportsByType[type] || 0
          return (
            <div key={type} className="p-4 rounded-xl bg-theme-card border border-theme text-center">
              <span className="text-2xl mb-1 block">{config.icon}</span>
              <p className="text-lg font-bold text-theme-primary">{count}</p>
              <p className="text-[10px] text-theme-secondary">{config.label}</p>
            </div>
          )
        })}
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants}>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 text-sm"
          />
        </div>
      </motion.div>

      {/* Content */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-theme-secondary">Loading reports...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <FileBarChart className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
            <p className="text-red-400 text-lg">{error}</p>
            <button onClick={loadData} className="btn-ghost mt-4 text-sm">Retry</button>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-16">
            <FileBarChart className="w-12 h-12 text-theme-muted mx-auto mb-4" />
            <p className="text-theme-secondary text-lg">
              {reports.length === 0 ? 'No reports yet' : 'No reports match your search'}
            </p>
            <p className="text-theme-muted text-sm mt-1">
              {reports.length === 0 ? 'Generate your first AI-powered report' : 'Try adjusting your search'}
            </p>
            {reports.length === 0 && (
              <button onClick={() => setShowGenerateModal(true)} className="btn-primary mt-4 text-sm">
                <Plus className="w-4 h-4 mr-2 inline" />
                Generate Report
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report, i) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedReport(report)}
                className="cursor-pointer"
              >
                <Card className="!p-4 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                      <FileBarChart className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-semibold text-theme-primary truncate">{report.title}</h3>
                        <span className="text-lg" title={reportTypeConfig[report.reportType]?.label}>
                          {reportTypeConfig[report.reportType]?.icon || '📄'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-theme-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(report.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {report.accountName && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {report.accountName}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {(report.generationTimeMs / 1000).toFixed(1)}s
                        </span>
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Generated
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Generate Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <GenerateReportModal
            accounts={accounts}
            onClose={() => setShowGenerateModal(false)}
            onGenerate={handleReportGenerated}
          />
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {selectedReport && (
          <ReportViewModal
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onDelete={handleReportDeleted}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
