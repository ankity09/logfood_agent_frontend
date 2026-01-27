import { useState } from 'react'
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

// Mock processed meeting notes
const mockNotes: MeetingNote[] = [
  {
    id: '1',
    filename: 'acme-quarterly-review-q4.txt',
    uploadDate: 'Jan 25, 2026',
    account: 'Acme Corporation',
    attendees: ['Sarah Chen', 'John Smith (Acme)', 'VP Engineering (Acme)'],
    summary: 'Quarterly review focused on expanding data lakehouse deployment and introducing ML pipeline automation. Client expressed strong interest in real-time analytics capabilities.',
    extractedUseCases: [
      {
        title: 'Real-time Analytics Dashboard',
        account: 'Acme Corporation',
        stage: 'POC',
        description: 'Client wants real-time analytics dashboard integrated with their existing data lakehouse for executive visibility.',
        nextSteps: ['Schedule technical deep-dive', 'Prepare POC environment', 'Share architecture document'],
        copied: false,
      },
      {
        title: 'ML Pipeline v2 Upgrade',
        account: 'Acme Corporation',
        stage: 'Negotiation',
        description: 'Upgrade existing ML pipeline to support automated retraining and A/B model testing.',
        nextSteps: ['Send updated pricing proposal', 'Align on timeline with engineering'],
        copied: false,
      },
    ],
    isExpanded: true,
  },
  {
    id: '2',
    filename: 'techstart-kickoff-meeting.txt',
    uploadDate: 'Jan 22, 2026',
    account: 'TechStart Inc',
    attendees: ['Mike Johnson', 'CTO (TechStart)', 'Data Team Lead (TechStart)'],
    summary: 'Initial discovery call with TechStart. They are evaluating solutions for customer analytics and fraud detection. Budget approved for Q1 initiatives.',
    extractedUseCases: [
      {
        title: 'Customer 360 Platform',
        account: 'TechStart Inc',
        stage: 'Discovery',
        description: 'Unified customer view combining web, mobile, and in-store data for personalized marketing.',
        nextSteps: ['Map data sources', 'Schedule data audit', 'Identify stakeholders'],
        copied: false,
      },
    ],
    isExpanded: false,
  },
]

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
          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
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
    <div className="p-4 rounded-xl bg-dark-200/50 border border-white/5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary shrink-0" />
          <h4 className="text-sm font-semibold text-white">{useCase.title}</h4>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
          {useCase.stage}
        </span>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">{useCase.description}</p>

      <div>
        <p className="text-xs text-gray-500 font-medium mb-1.5">Next Steps:</p>
        <ul className="space-y-1">
          {useCase.nextSteps.map((step, i) => (
            <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
              <span className="text-primary mt-0.5">-</span>
              {step}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        <CopyButton text={formattedText} label="Copy to Clipboard" />
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
          <ExternalLink className="w-3 h-3" />
          Export to Salesforce
        </button>
      </div>
    </div>
  )
}

export function MeetingNotesPage() {
  const [notes, setNotes] = useState<MeetingNote[]>(mockNotes)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

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
      simulateUpload(files[0].name)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      simulateUpload(files[0].name)
    }
  }

  const simulateUpload = (filename: string) => {
    setUploadedFileName(filename)
    setIsProcessing(true)

    // Simulate processing delay
    setTimeout(() => {
      const newNote: MeetingNote = {
        id: Date.now().toString(),
        filename,
        uploadDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        account: 'New Account',
        attendees: ['You', 'Client Team'],
        summary: 'AI is analyzing your meeting notes. Use case details will be extracted and displayed here once processing is complete.',
        extractedUseCases: [
          {
            title: 'Extracted Use Case',
            account: 'New Account',
            stage: 'Discovery',
            description: 'This use case was automatically extracted from your uploaded meeting notes.',
            nextSteps: ['Review extracted details', 'Update account information', 'Schedule follow-up'],
            copied: false,
          },
        ],
        isExpanded: true,
      }

      setNotes((prev) => [newNote, ...prev])
      setIsProcessing(false)
      setUploadedFileName(null)
    }, 3000)
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
          <h1 className="text-3xl font-bold text-white">Meeting Notes</h1>
          <p className="text-gray-400 mt-1">Upload meeting notes and extract use case details automatically.</p>
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
              : 'border-white/10 hover:border-white/20 bg-dark-100/30'
          }`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin" />
              </div>
              <div>
                <p className="text-white font-medium">Processing "{uploadedFileName}"</p>
                <p className="text-sm text-gray-400 mt-1">Extracting use case details from your meeting notes...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Upload Meeting Notes</h3>
              <p className="text-sm text-gray-400 mb-4">
                Drag and drop your meeting notes here, or click to browse.
              </p>
              <p className="text-xs text-gray-500 mb-6">Supports .txt, .md, .docx, .pdf files</p>
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
      </motion.div>

      {/* How it works */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Upload Notes', desc: 'Upload your raw meeting notes in any text format.', icon: <Upload className="w-5 h-5" /> },
            { step: '2', title: 'AI Extraction', desc: 'Our AI analyzes and extracts use case details, stages, and next steps.', icon: <Sparkles className="w-5 h-5" /> },
            { step: '3', title: 'Copy & Export', desc: 'Copy extracted information to paste into Salesforce or other tools.', icon: <ClipboardCopy className="w-5 h-5" /> },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3 p-4 rounded-xl bg-dark-100/30 border border-white/5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                {item.icon}
              </div>
              <div>
                <h4 className="text-sm font-medium text-white">{item.title}</h4>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Processed Notes */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Processed Notes</h2>

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
                  className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-semibold text-white">{note.filename}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
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
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {note.isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5"
                    >
                      <div className="p-5 space-y-4">
                        {/* Summary */}
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Summary</h4>
                          <p className="text-sm text-gray-300 leading-relaxed">{note.summary}</p>
                        </div>

                        {/* Attendees */}
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Attendees</h4>
                          <div className="flex flex-wrap gap-2">
                            {note.attendees.map((a, i) => (
                              <span key={i} className="text-xs bg-dark-50 text-gray-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                                <Users className="w-3 h-3" />
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Extracted Use Cases */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Extracted Use Cases</h4>
                            <button
                              onClick={() => copyAllUseCases(note)}
                              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                            >
                              <ClipboardCopy className="w-3 h-3" />
                              Copy All
                            </button>
                          </div>
                          <div className="space-y-3">
                            {note.extractedUseCases.map((uc, i) => (
                              <ExtractedUseCaseCard key={i} useCase={uc} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
