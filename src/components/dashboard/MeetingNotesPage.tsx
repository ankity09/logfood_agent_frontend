import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  Building2,
  Target,
  Users,
  ExternalLink,
  ClipboardCopy,
  Loader2,
  AlertCircle,
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

interface ExtractedUseCase {
  title: string
  account: string
  stage: string
  description: string
  nextSteps: string[]
  copied: boolean
}

interface MeetingNote {
  id: string
  filename: string
  uploadDate: string
  account: string
  attendees: string[]
  extractedUseCases: ExtractedUseCase[]
  summary: string
  isExpanded: boolean
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        copied
          ? 'bg-green-400/10 text-green-400'
          : 'bg-theme-elevated text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle border border-theme'
      }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {label || (copied ? 'Copied!' : 'Copy')}
    </button>
  )
}

function ExtractedUseCaseCard({ useCase }: { useCase: ExtractedUseCase }) {
  const formattedText = `Use Case: ${useCase.title}\nAccount: ${useCase.account}\nStage: ${useCase.stage}\nDescription: ${useCase.description}\nNext Steps:\n${useCase.nextSteps.map((s) => `- ${s}`).join('\n')}`

  return (
    <div className="p-4 rounded-xl bg-theme-elevated border border-theme space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary shrink-0" />
          <h4 className="text-sm font-semibold text-theme-primary">{useCase.title}</h4>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
          {useCase.stage}
        </span>
      </div>

      <p className="text-xs text-theme-secondary leading-relaxed">{useCase.description}</p>

      <div>
        <p className="text-xs text-theme-muted font-medium mb-1.5">Next Steps:</p>
        <ul className="space-y-1">
          {useCase.nextSteps.map((step, i) => (
            <li key={i} className="text-xs text-theme-secondary flex items-start gap-2">
              <span className="text-primary mt-0.5">-</span>
              {step}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-theme">
        <CopyButton text={formattedText} label="Copy to Clipboard" />
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-theme-elevated text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle border border-theme transition-all">
          <ExternalLink className="w-3 h-3" />
          Export to Salesforce
        </button>
      </div>
    </div>
  )
}

/**
 * Read file content as text
 */
async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Call the AI extraction endpoint
 */
async function extractUseCasesFromNotes(
  meetingNotes: string,
  filename: string
): Promise<{
  summary: string
  attendees: string[]
  account: string | null
  useCases: Array<{
    title: string
    description: string
    stage: string
    nextSteps: string[]
  }>
}> {
  const url = `${databricksConfig.api.baseUrl}/extract-use-cases`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meetingNotes, filename }),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    const detail = errBody.details || errBody.error || `HTTP ${res.status}`
    throw new Error(detail)
  }
  return res.json()
}

/**
 * Save meeting note to database
 */
async function saveMeetingNote(data: {
  filename: string
  account_id: string | null
  summary: string
  attendees: string[]
}): Promise<{ id: string }> {
  const url = `${databricksConfig.api.baseUrl}${databricksConfig.api.meetingNotesEndpoint}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Save extracted use case to database
 */
async function saveExtractedUseCase(data: {
  meeting_note_id: string
  title: string
  description: string
  suggested_stage: string
  next_steps: string[]
}): Promise<{ id: string }> {
  const url = `${databricksConfig.api.baseUrl}${databricksConfig.api.extractedUseCasesEndpoint}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.error || `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Fetch accounts list
 */
async function fetchAccounts(): Promise<Array<{ id: string; name: string }>> {
  const url = `${databricksConfig.api.baseUrl}${databricksConfig.api.accountsEndpoint}`
  const res = await fetch(url)
  if (!res.ok) return []
  return res.json()
}

/**
 * Create a new account
 */
async function createAccount(name: string): Promise<{ id: string; name: string }> {
  const url = `${databricksConfig.api.baseUrl}${databricksConfig.api.accountsEndpoint}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export function MeetingNotesPage() {
  const [notes, setNotes] = useState<MeetingNote[]>([])
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [processingStatus, setProcessingStatus] = useState<string>('')
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        // Load meeting notes and accounts in parallel
        const [notesRes, accountsData] = await Promise.all([
          fetch(`${databricksConfig.api.baseUrl}${databricksConfig.api.meetingNotesEndpoint}`),
          fetchAccounts(),
        ])

        setAccounts(accountsData)

        if (notesRes.ok) {
          const data = await notesRes.json()
          // Transform API response to MeetingNote shape
          const transformed: MeetingNote[] = data.map((n: Record<string, unknown>, i: number) => ({
            id: n.id as string,
            filename: n.filename as string,
            uploadDate: n.uploadDate as string,
            account: n.account as string,
            attendees: (n.attendees as string[]) || [],
            summary: n.summary as string,
            isExpanded: i === 0,
            extractedUseCases: ((n.extractedUseCases as Array<Record<string, unknown>>) || []).map(
              (euc) => ({
                title: euc.title as string,
                account: n.account as string,
                stage: euc.stage as string,
                description: euc.description as string,
                nextSteps: (euc.nextSteps as string[]) || [],
                copied: false,
              })
            ),
          }))
          setNotes(transformed)
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const toggleExpand = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isExpanded: !n.isExpanded } : n))
    )
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  const processFile = async (file: File) => {
    setUploadedFileName(file.name)
    setIsProcessing(true)
    setProcessingError(null)
    setProcessingStatus('Reading file...')

    try {
      // Step 1: Read file content
      const fileContent = await readFileAsText(file)

      if (!fileContent.trim()) {
        throw new Error('File is empty')
      }

      setProcessingStatus('Analyzing with AI...')

      // Step 2: Call AI extraction endpoint
      const extracted = await extractUseCasesFromNotes(fileContent, file.name)

      setProcessingStatus('Saving to database...')

      // Step 3: Find or create matching account
      let accountId: string | null = null
      let accountName = extracted.account || 'Unknown Account'
      if (extracted.account) {
        // Try to find an existing account
        const matchedAccount = accounts.find(
          (a) => a.name.toLowerCase().includes(extracted.account!.toLowerCase()) ||
                 extracted.account!.toLowerCase().includes(a.name.toLowerCase())
        )
        if (matchedAccount) {
          accountId = matchedAccount.id
          accountName = matchedAccount.name
        } else {
          // Create a new account if not found
          try {
            setProcessingStatus('Creating new account...')
            const newAccount = await createAccount(extracted.account)
            accountId = newAccount.id
            accountName = newAccount.name
            // Update local accounts list
            setAccounts((prev) => [...prev, newAccount])
          } catch (err) {
            console.error('Failed to create account:', err)
            // Fall through - will try with null which may fail
          }
        }
      }

      // If still no account, create "Unknown Account" as fallback
      if (!accountId) {
        try {
          setProcessingStatus('Creating fallback account...')
          const fallbackAccount = await createAccount(accountName)
          accountId = fallbackAccount.id
          accountName = fallbackAccount.name
          setAccounts((prev) => [...prev, fallbackAccount])
        } catch (err) {
          console.error('Failed to create fallback account:', err)
          throw new Error('Unable to save meeting note: no account could be created')
        }
      }

      // Step 4: Save meeting note to database
      const savedNote = await saveMeetingNote({
        filename: file.name,
        account_id: accountId,
        summary: extracted.summary,
        attendees: extracted.attendees,
      })

      // Step 5: Save extracted use cases to database
      const savedUseCases: ExtractedUseCase[] = []
      for (const uc of extracted.useCases) {
        try {
          await saveExtractedUseCase({
            meeting_note_id: savedNote.id,
            title: uc.title,
            description: uc.description,
            suggested_stage: uc.stage,
            next_steps: uc.nextSteps,
          })
          savedUseCases.push({
            title: uc.title,
            account: accountName,
            stage: uc.stage,
            description: uc.description,
            nextSteps: uc.nextSteps,
            copied: false,
          })
        } catch (err) {
          console.error('Failed to save extracted use case:', err)
        }
      }

      // Step 6: Add to local state
      const newNote: MeetingNote = {
        id: savedNote.id,
        filename: file.name,
        uploadDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        account: accountName,
        attendees: extracted.attendees,
        summary: extracted.summary,
        extractedUseCases: savedUseCases,
        isExpanded: true,
      }

      setNotes((prev) => [newNote, ...prev])
      setProcessingStatus('')
    } catch (err) {
      console.error('Processing error:', err)
      setProcessingError(err instanceof Error ? err.message : 'Failed to process file')
      setProcessingStatus('')
    } finally {
      setIsProcessing(false)
      setUploadedFileName(null)
    }
  }

  const copyAllUseCases = (note: MeetingNote) => {
    const allText = note.extractedUseCases.map((uc) =>
      `Use Case: ${uc.title}\nAccount: ${uc.account}\nStage: ${uc.stage}\nDescription: ${uc.description}\nNext Steps:\n${uc.nextSteps.map((s) => `- ${s}`).join('\n')}`
    ).join('\n\n---\n\n')

    navigator.clipboard.writeText(allText)
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
          <h1 className="text-3xl font-bold text-theme-primary">Meeting Notes</h1>
          <p className="text-theme-secondary mt-1">Upload meeting notes and extract use case details automatically with AI.</p>
        </div>
      </motion.div>

      {/* Upload Area */}
      <motion.div variants={itemVariants}>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-theme hover:border-primary/30 bg-theme-elevated'
          }`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin" />
              </div>
              <div>
                <p className="text-theme-primary font-medium">Processing "{uploadedFileName}"</p>
                <p className="text-sm text-primary mt-1">{processingStatus}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-neon-purple/20 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-theme-primary mb-2">Upload Meeting Notes</h3>
              <p className="text-sm text-theme-secondary mb-4">
                Drag and drop your meeting notes here, or click to browse.
              </p>
              <p className="text-xs text-theme-muted mb-6">Supports .txt, .md, .docx, .pdf files</p>
              <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Browse Files
                <input
                  type="file"
                  accept=".txt,.md,.docx,.pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>

        {/* Error Display */}
        {processingError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Failed to process file</p>
              <p className="text-xs text-red-400/70 mt-1">{processingError}</p>
            </div>
            <button
              onClick={() => setProcessingError(null)}
              className="ml-auto text-red-400 hover:text-red-300 text-xs"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* How it works */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Upload Notes', desc: 'Upload your raw meeting notes in any text format.', icon: <Upload className="w-5 h-5" /> },
            { step: '2', title: 'AI Extraction', desc: 'Databricks AI analyzes and extracts use cases, stages, and next steps.', icon: <Sparkles className="w-5 h-5" /> },
            { step: '3', title: 'Copy & Export', desc: 'Copy extracted information to paste into Salesforce or other tools.', icon: <ClipboardCopy className="w-5 h-5" /> },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3 p-4 rounded-xl bg-theme-elevated border border-theme">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                {item.icon}
              </div>
              <div>
                <h4 className="text-sm font-medium text-theme-primary">{item.title}</h4>
                <p className="text-xs text-theme-secondary mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Processed Notes */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h2 className="text-xl font-semibold text-theme-primary">Processed Notes</h2>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
            <p className="text-theme-secondary">Loading meeting notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-theme-muted mx-auto mb-4" />
            <p className="text-theme-secondary text-lg">No meeting notes yet</p>
            <p className="text-theme-muted text-sm mt-1">Upload your first meeting notes above to get started</p>
          </div>
        ) : (
        <AnimatePresence>
          {notes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card hover={false} className="!p-0 overflow-hidden">
                {/* Note Header */}
                <button
                  onClick={() => toggleExpand(note.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-theme-subtle transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-neon-purple/20 text-primary border border-primary/20">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-semibold text-theme-primary">{note.filename}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-theme-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {note.uploadDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {note.account}
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {note.extractedUseCases.length} use case{note.extractedUseCases.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  {note.isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-theme-secondary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-theme-secondary" />
                  )}
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {note.isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-theme"
                    >
                      <div className="p-5 space-y-4">
                        {/* Summary */}
                        <div>
                          <h4 className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-2">Summary</h4>
                          <p className="text-sm text-theme-secondary leading-relaxed">{note.summary}</p>
                        </div>

                        {/* Attendees */}
                        {note.attendees.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-theme-muted uppercase tracking-wider mb-2">Attendees</h4>
                            <div className="flex flex-wrap gap-2">
                              {note.attendees.map((a, i) => (
                                <span key={i} className="text-xs bg-theme-elevated text-theme-secondary px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-theme">
                                  <Users className="w-3 h-3" />
                                  {a}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Extracted Use Cases */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-medium text-theme-muted uppercase tracking-wider">Extracted Use Cases</h4>
                            {note.extractedUseCases.length > 0 && (
                              <button
                                onClick={() => copyAllUseCases(note)}
                                className="flex items-center gap-1.5 text-xs text-theme-secondary hover:text-theme-primary transition-colors"
                              >
                                <ClipboardCopy className="w-3 h-3" />
                                Copy All
                              </button>
                            )}
                          </div>
                          {note.extractedUseCases.length > 0 ? (
                            <div className="space-y-3">
                              {note.extractedUseCases.map((uc, i) => (
                                <ExtractedUseCaseCard key={i} useCase={uc} />
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-theme-muted italic">No use cases were extracted from this meeting.</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        )}
      </motion.div>
    </motion.div>
  )
}
