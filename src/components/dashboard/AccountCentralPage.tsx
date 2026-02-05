import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  Search,
  Target,
  FileText,
  ChevronRight,
  Loader2,
  TrendingUp,
  LayoutGrid,
  List,
  Factory,
  DollarSign,
  X,
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

interface Account {
  id: string
  name: string
  industry: string | null
  created_at: string
}

interface UseCase {
  id: string
  title: string
  stage: Stage
  value_cents: number
  valueCents: number
  account_id: string
  accountId: string
  owner_id: string
}

interface MeetingNote {
  id: string
  filename: string
  account_id: string
  accountId: string
  uploaded_at: string
}

interface AccountWithStats extends Account {
  useCases: UseCase[]
  meetingNotes: MeetingNote[]
  useCaseCount: number
  totalValue: number
  stageDistribution: Record<Stage, number>
}

const stageConfig: Record<Stage, { label: string; color: string; bgColor: string }> = {
  validating: { label: 'Validating', color: 'text-neon-blue', bgColor: 'bg-neon-blue/20' },
  scoping: { label: 'Scoping', color: 'text-neon-purple', bgColor: 'bg-neon-purple/20' },
  evaluating: { label: 'Evaluating', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' },
  confirming: { label: 'Confirming', color: 'text-neon-pink', bgColor: 'bg-neon-pink/20' },
  onboarding: { label: 'Onboarding', color: 'text-primary', bgColor: 'bg-primary/20' },
  live: { label: 'Live', color: 'text-green-400', bgColor: 'bg-green-400/20' },
}

function formatValue(valueCents: number): string {
  if (!valueCents || valueCents === 0) return '$0'
  const k = valueCents / 100000
  if (k >= 1000) return `$${(k / 1000).toFixed(1)}M`
  return `$${Math.round(k)}K`
}

async function fetchAccounts(): Promise<Account[]> {
  const url = `${databricksConfig.api.baseUrl}${databricksConfig.api.accountsEndpoint}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch accounts: ${res.status}`)
  return res.json()
}

async function fetchUseCases(): Promise<UseCase[]> {
  const url = `${databricksConfig.api.baseUrl}${databricksConfig.api.useCasesEndpoint}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch use cases: ${res.status}`)
  return res.json()
}

async function fetchMeetingNotes(): Promise<MeetingNote[]> {
  const url = `${databricksConfig.api.baseUrl}${databricksConfig.api.meetingNotesEndpoint}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch meeting notes: ${res.status}`)
  return res.json()
}

function StageDistributionBar({ distribution }: { distribution: Record<Stage, number> }) {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0)
  if (total === 0) return <div className="h-2 bg-theme-elevated rounded-full" />

  const stages: Stage[] = ['validating', 'scoping', 'evaluating', 'confirming', 'onboarding', 'live']

  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-theme-elevated">
      {stages.map(stage => {
        const count = distribution[stage] || 0
        const width = (count / total) * 100
        if (width === 0) return null
        return (
          <div
            key={stage}
            className={stageConfig[stage].bgColor}
            style={{ width: `${width}%` }}
            title={`${stageConfig[stage].label}: ${count}`}
          />
        )
      })}
    </div>
  )
}

function AccountCard({
  account,
  onSelect,
}: {
  account: AccountWithStats
  onSelect: () => void
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onSelect}
      className="cursor-pointer"
    >
      <Card className="!p-5 hover:border-primary/30 transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-theme-primary">{account.name}</h3>
              {account.industry && (
                <p className="text-xs text-theme-secondary flex items-center gap-1 mt-0.5">
                  <Factory className="w-3 h-3" />
                  {account.industry}
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-theme-muted" />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-theme-elevated">
            <p className="text-lg font-bold text-theme-primary">{account.useCaseCount}</p>
            <p className="text-[10px] text-theme-secondary">Use Cases</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-theme-elevated">
            <p className="text-lg font-bold text-primary">{formatValue(account.totalValue)}</p>
            <p className="text-[10px] text-theme-secondary">Total Value</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-theme-elevated">
            <p className="text-lg font-bold text-theme-primary">{account.meetingNotes.length}</p>
            <p className="text-[10px] text-theme-secondary">Meetings</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] text-theme-muted uppercase tracking-wider mb-1.5">Stage Distribution</p>
          <StageDistributionBar distribution={account.stageDistribution} />
        </div>
      </Card>
    </motion.div>
  )
}

function AccountDetailModal({
  account,
  onClose,
}: {
  account: AccountWithStats
  onClose: () => void
}) {
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
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-theme-primary">{account.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                {account.industry && (
                  <span className="text-sm text-theme-secondary flex items-center gap-1">
                    <Factory className="w-4 h-4" />
                    {account.industry}
                  </span>
                )}
                <span className="text-sm text-theme-muted">
                  Since {new Date(account.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
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

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-theme-elevated border border-theme">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs text-theme-muted uppercase">Use Cases</span>
              </div>
              <p className="text-2xl font-bold text-theme-primary">{account.useCaseCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-theme-elevated border border-theme">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-xs text-theme-muted uppercase">Total Value</span>
              </div>
              <p className="text-2xl font-bold text-primary">{formatValue(account.totalValue)}</p>
            </div>
            <div className="p-4 rounded-xl bg-theme-elevated border border-theme">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-xs text-theme-muted uppercase">Meetings</span>
              </div>
              <p className="text-2xl font-bold text-theme-primary">{account.meetingNotes.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-theme-elevated border border-theme">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-xs text-theme-muted uppercase">Live</span>
              </div>
              <p className="text-2xl font-bold text-green-400">{account.stageDistribution.live || 0}</p>
            </div>
          </div>

          {/* Stage Distribution */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-theme-primary mb-3">Stage Distribution</h4>
            <div className="grid grid-cols-6 gap-2">
              {(['validating', 'scoping', 'evaluating', 'confirming', 'onboarding', 'live'] as Stage[]).map(stage => (
                <div key={stage} className={`p-3 rounded-lg text-center ${stageConfig[stage].bgColor}`}>
                  <p className={`text-lg font-bold ${stageConfig[stage].color}`}>
                    {account.stageDistribution[stage] || 0}
                  </p>
                  <p className="text-[10px] text-theme-secondary">{stageConfig[stage].label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Use Cases List */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-theme-primary mb-3">
              Use Cases ({account.useCases.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {account.useCases.length === 0 ? (
                <p className="text-sm text-theme-muted italic py-4 text-center">No use cases yet</p>
              ) : (
                account.useCases.map(uc => (
                  <div key={uc.id} className="flex items-center justify-between p-3 bg-theme-elevated rounded-lg border border-theme">
                    <div className="flex items-center gap-3">
                      <Target className="w-4 h-4 text-theme-secondary" />
                      <span className="text-sm text-theme-primary">{uc.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${stageConfig[uc.stage].bgColor} ${stageConfig[uc.stage].color}`}>
                        {stageConfig[uc.stage].label}
                      </span>
                      <span className="text-xs text-theme-secondary">{formatValue(uc.value_cents)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Meeting Notes */}
          <div>
            <h4 className="text-sm font-medium text-theme-primary mb-3">
              Recent Meeting Notes ({account.meetingNotes.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {account.meetingNotes.length === 0 ? (
                <p className="text-sm text-theme-muted italic py-4 text-center">No meeting notes yet</p>
              ) : (
                account.meetingNotes.slice(0, 5).map(mn => (
                  <div key={mn.id} className="flex items-center justify-between p-3 bg-theme-elevated rounded-lg border border-theme">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-theme-secondary" />
                      <span className="text-sm text-theme-primary truncate">{mn.filename}</span>
                    </div>
                    <span className="text-xs text-theme-muted">
                      {new Date(mn.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function AccountCentralPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [accounts, setAccounts] = useState<AccountWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<AccountWithStats | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [accountsData, useCasesData, meetingNotesData] = await Promise.all([
        fetchAccounts(),
        fetchUseCases(),
        fetchMeetingNotes(),
      ])

      // Aggregate data by account
      const accountsWithStats: AccountWithStats[] = accountsData.map(account => {
        const accountUseCases = useCasesData.filter(uc => uc.accountId === account.id)
        const accountMeetingNotes = meetingNotesData.filter(mn => mn.accountId === account.id)

        const stageDistribution: Record<Stage, number> = {
          validating: 0,
          scoping: 0,
          evaluating: 0,
          confirming: 0,
          onboarding: 0,
          live: 0,
        }

        let totalValue = 0
        accountUseCases.forEach(uc => {
          if (uc.stage && stageDistribution[uc.stage] !== undefined) {
            stageDistribution[uc.stage]++
          }
          totalValue += uc.valueCents || 0
        })

        return {
          ...account,
          useCases: accountUseCases,
          meetingNotes: accountMeetingNotes,
          useCaseCount: accountUseCases.length,
          totalValue,
          stageDistribution,
        }
      })

      // Sort by total value (highest first)
      accountsWithStats.sort((a, b) => b.totalValue - a.totalValue)

      setAccounts(accountsWithStats)
    } catch (err) {
      console.error('Failed to load account data:', err)
      setError('Failed to load accounts. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredAccounts = accounts.filter(account => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      account.name.toLowerCase().includes(q) ||
      (account.industry && account.industry.toLowerCase().includes(q))
    )
  })

  const totalUseCases = accounts.reduce((sum, a) => sum + a.useCaseCount, 0)
  const totalValue = accounts.reduce((sum, a) => sum + a.totalValue, 0)
  const totalMeetings = accounts.reduce((sum, a) => sum + a.meetingNotes.length, 0)

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
          <h1 className="text-3xl font-bold text-theme-primary">Account Central</h1>
          <p className="text-theme-secondary mt-1">Overview of all accounts with aggregated metrics.</p>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-theme-card border border-theme">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs text-theme-muted uppercase">Accounts</span>
          </div>
          <p className="text-3xl font-bold text-theme-primary">{accounts.length}</p>
        </div>
        <div className="p-5 rounded-xl bg-theme-card border border-theme">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-neon-blue/10">
              <Target className="w-5 h-5 text-neon-blue" />
            </div>
            <span className="text-xs text-theme-muted uppercase">Use Cases</span>
          </div>
          <p className="text-3xl font-bold text-neon-blue">{totalUseCases}</p>
        </div>
        <div className="p-5 rounded-xl bg-theme-card border border-theme">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-400/10">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-xs text-theme-muted uppercase">Total Value</span>
          </div>
          <p className="text-3xl font-bold text-green-400">{formatValue(totalValue)}</p>
        </div>
        <div className="p-5 rounded-xl bg-theme-card border border-theme">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-neon-purple/10">
              <FileText className="w-5 h-5 text-neon-purple" />
            </div>
            <span className="text-xs text-theme-muted uppercase">Meetings</span>
          </div>
          <p className="text-3xl font-bold text-neon-purple">{totalMeetings}</p>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 text-sm"
          />
        </div>
        <div className="flex bg-theme-elevated rounded-lg border border-theme p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-theme-secondary hover:text-theme-primary'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-theme-secondary hover:text-theme-primary'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div variants={itemVariants}>
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-theme-secondary">Loading accounts...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
            <p className="text-red-400 text-lg">{error}</p>
            <button onClick={loadData} className="btn-ghost mt-4 text-sm">Retry</button>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-theme-muted mx-auto mb-4" />
            <p className="text-theme-secondary text-lg">No accounts found</p>
            <p className="text-theme-muted text-sm mt-1">Try adjusting your search</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAccounts.map((account, i) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <AccountCard account={account} onSelect={() => setSelectedAccount(account)} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAccounts.map((account, i) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedAccount(account)}
                className="cursor-pointer"
              >
                <Card className="!p-4 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-semibold text-theme-primary truncate">{account.name}</h3>
                        {account.industry && (
                          <span className="text-xs text-theme-muted flex items-center gap-1">
                            <Factory className="w-3 h-3" />
                            {account.industry}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-theme-secondary">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {account.useCaseCount} use cases
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {formatValue(account.totalValue)}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {account.meetingNotes.length} meetings
                        </span>
                      </div>
                    </div>
                    <div className="w-32 hidden sm:block">
                      <StageDistributionBar distribution={account.stageDistribution} />
                    </div>
                    <ChevronRight className="w-5 h-5 text-theme-muted shrink-0" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedAccount && (
          <AccountDetailModal
            account={selectedAccount}
            onClose={() => setSelectedAccount(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
