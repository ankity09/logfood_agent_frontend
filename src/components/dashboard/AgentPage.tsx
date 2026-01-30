import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Send,
  Sparkles,
  Bot,
  User,
  AlertCircle,
  Paperclip,
  Mic,
  Image,
  FileText,
  X,
  Copy,
  Check,
  Plus,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { databricksConfig } from '../../config'
import { useToast } from '../../context/ToastContext'

// Storage key for persisting current session
const CURRENT_SESSION_KEY = 'logfood_agent_current_session'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant' | 'error'
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  timestamp: Date
  attachments?: { name: string; type: string }[]
}

interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface ApiMessage {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
}

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

const suggestedPrompts = [
  'Summarize the latest meeting notes for Acme Corp',
  'What use cases are currently in the POC stage?',
  'Draft a follow-up email for the TechStart meeting',
  'Show me accounts with stalled use cases',
]

// Helper to extract title from first message (first 50 chars)
function extractTitle(content: string): string {
  const cleaned = content.replace(/\n/g, ' ').trim()
  if (cleaned.length <= 50) return cleaned
  return cleaned.substring(0, 47) + '...'
}

// Helper to format relative time
function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function AgentPage() {
  // Toast notifications
  const toast = useToast()

  // Session state
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [attachments, setAttachments] = useState<{ name: string; type: string }[]>([])
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  // Polling state
  const [processingMessageId, setProcessingMessageId] = useState<string | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Persist current session ID to localStorage
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId)
    } else {
      localStorage.removeItem(CURRENT_SESSION_KEY)
    }
  }, [currentSessionId])

  // Fetch sessions on mount and restore last session
  useEffect(() => {
    fetchSessions()
  }, [])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true)
      const res = await fetch(`${databricksConfig.api.baseUrl}${databricksConfig.api.chatSessionsEndpoint}`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data)

        // Restore last session if exists
        const savedSessionId = localStorage.getItem(CURRENT_SESSION_KEY)
        if (savedSessionId && data.some((s: ChatSession) => s.id === savedSessionId)) {
          loadSession(savedSessionId)
        }
      } else {
        toast.error('Failed to load chat history')
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
      toast.error('Failed to connect to server')
    } finally {
      setSessionsLoading(false)
    }
  }

  // Poll for message status
  const pollMessageStatus = useCallback(async (messageId: string) => {
    try {
      const res = await fetch(
        `${databricksConfig.api.baseUrl}${databricksConfig.api.chatMessagesEndpoint}/${messageId}/status`
      )
      if (res.ok) {
        const data: ApiMessage = await res.json()

        if (data.status === 'completed' || data.status === 'failed') {
          // Update message with final content
          setMessages(prev => prev.map(m =>
            m.id === messageId
              ? { ...m, content: data.content, status: data.status, role: data.status === 'failed' ? 'error' : m.role }
              : m
          ))

          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          setProcessingMessageId(null)
          setIsTyping(false)

          if (data.status === 'completed') {
            toast.success('Response received')
          } else {
            toast.error('Failed to get response')
          }
        }
      }
    } catch (err) {
      console.error('Polling error:', err)
    }
  }, [toast])

  // Start polling for a message
  const startPolling = useCallback((messageId: string) => {
    setProcessingMessageId(messageId)

    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      pollMessageStatus(messageId)
    }, 2000)

    // Also poll immediately
    pollMessageStatus(messageId)
  }, [pollMessageStatus])

  // Load session messages
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(
        `${databricksConfig.api.baseUrl}${databricksConfig.api.chatSessionsEndpoint}/${sessionId}`
      )
      if (res.ok) {
        const data = await res.json()

        // Convert API messages to local format
        const loadedMessages: Message[] = data.messages.map((m: ApiMessage) => ({
          id: m.id,
          content: m.content,
          role: m.status === 'failed' ? 'error' : m.role,
          status: m.status,
          timestamp: new Date(m.created_at),
        }))

        setMessages(loadedMessages)
        setCurrentSessionId(sessionId)

        // Check if there's a processing message
        const processingMsg = loadedMessages.find(m => m.status === 'processing')
        if (processingMsg) {
          setIsTyping(true)
          startPolling(processingMsg.id)
          toast.info('Resuming conversation - waiting for response...')
        } else {
          toast.info('Conversation loaded')
        }
      } else {
        toast.error('Failed to load conversation')
      }
    } catch (err) {
      console.error('Failed to load session:', err)
      toast.error('Failed to load conversation')
    }
  }, [toast, startPolling])

  // Create new session
  const createSession = async (title: string): Promise<string | null> => {
    try {
      const res = await fetch(
        `${databricksConfig.api.baseUrl}${databricksConfig.api.chatSessionsEndpoint}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        }
      )
      if (res.ok) {
        const session = await res.json()
        setSessions(prev => [session, ...prev])
        toast.success('New conversation started')
        return session.id
      } else {
        toast.error('Failed to create conversation')
      }
    } catch (err) {
      console.error('Failed to create session:', err)
      toast.error('Failed to create conversation')
    }
    return null
  }

  // Delete session
  const deleteSession = async (sessionId: string) => {
    try {
      const res = await fetch(
        `${databricksConfig.api.baseUrl}${databricksConfig.api.chatSessionsEndpoint}/${sessionId}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
        if (currentSessionId === sessionId) {
          startNewChat()
        }
        toast.success('Conversation deleted')
      } else {
        toast.error('Failed to delete conversation')
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
      toast.error('Failed to delete conversation')
    }
  }

  // Start new chat
  const startNewChat = () => {
    // Stop any polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setProcessingMessageId(null)
    setIsTyping(false)
    setCurrentSessionId(null)
    setMessages([])
    setInput('')
    inputRef.current?.focus()
  }

  const handleCopyMessage = (messageId: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedMessageId(messageId)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSend = async () => {
    if (!input.trim() || isTyping) return

    const userContent = input.trim()

    setInput('')
    setAttachments([])
    setIsTyping(true)

    // Create session if this is the first message
    let sessionId = currentSessionId
    if (!sessionId) {
      const title = extractTitle(userContent)
      sessionId = await createSession(title)
      if (!sessionId) {
        setIsTyping(false)
        return
      }
      setCurrentSessionId(sessionId)
    }

    try {
      // Call the backend chat endpoint which handles everything
      const response = await fetch(
        `${databricksConfig.api.baseUrl}${databricksConfig.api.chatSessionsEndpoint}/${sessionId}/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: userContent }),
        }
      )

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      // Add user message to UI
      const userMessage: Message = {
        id: data.userMessage.id,
        content: data.userMessage.content,
        role: 'user',
        status: 'completed',
        timestamp: new Date(data.userMessage.created_at),
        attachments: attachments.length > 0 ? [...attachments] : undefined,
      }

      // Add processing assistant message to UI
      const assistantMessage: Message = {
        id: data.assistantMessage.id,
        content: '',
        role: 'assistant',
        status: 'processing',
        timestamp: new Date(data.assistantMessage.created_at),
      }

      setMessages(prev => [...prev, userMessage, assistantMessage])

      // Start polling for the response
      startPolling(data.assistantMessage.id)

    } catch (error) {
      console.error('Chat error:', error)
      setIsTyping(false)
      toast.error('Failed to send message')

      // Add error message to UI
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Failed to send message. Please try again.',
        role: 'error',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileAttach = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newAttachments = Array.from(files).map((f) => ({
        name: f.name,
        type: f.type,
      }))
      setAttachments((prev) => [...prev, ...newAttachments])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  // Check if current view is a fresh conversation (no messages yet)
  const isNewConversation = messages.length === 0

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="h-[calc(100vh-64px)] flex"
    >
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: sidebarCollapsed ? 0 : 280 }}
        transition={{ duration: 0.2 }}
        className="h-full flex-shrink-0 overflow-hidden"
      >
        <div className="w-[280px] h-full bg-theme-card border-r border-theme flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-theme">
            <button
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-neon-blue text-dark font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              New Chat
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-theme-muted animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageSquare className="w-8 h-8 text-theme-muted mx-auto mb-2" />
                <p className="text-sm text-theme-muted">No conversations yet</p>
                <p className="text-xs text-theme-muted mt-1">Start a new chat to begin</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      currentSessionId === session.id
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-theme-subtle'
                    }`}
                    onClick={() => loadSession(session.id)}
                  >
                    <MessageSquare className={`w-4 h-4 flex-shrink-0 ${
                      currentSessionId === session.id ? 'text-primary' : 'text-theme-muted'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${
                        currentSessionId === session.id ? 'text-primary font-medium' : 'text-theme-primary'
                      }`}>
                        {session.title}
                      </p>
                      <p className="text-xs text-theme-muted truncate">
                        {formatRelativeTime(session.updated_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSession(session.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/10 text-theme-muted hover:text-red-400 transition-all"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-theme text-xs text-theme-muted text-center">
            {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
          </div>
        </div>
      </motion.div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-theme-card border border-theme rounded-r-lg text-theme-muted hover:text-theme-primary transition-colors"
        style={{ left: sidebarCollapsed ? 0 : 280 }}
      >
        {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col p-6 lg:p-8 min-w-0">
        {/* Page Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-theme-primary">Research Agent</h1>
            <p className="text-theme-secondary mt-1">
              {currentSessionId
                ? sessions.find(s => s.id === currentSessionId)?.title || 'Chat'
                : 'Your intelligent assistant for deep account research and analysis.'}
            </p>
          </div>
          {processingMessageId && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </div>
          )}
        </motion.div>

        {/* Chat Container */}
        <motion.div
          variants={itemVariants}
          className="flex-1 glass-card overflow-hidden flex flex-col"
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            {/* Welcome message for new conversations */}
            {isNewConversation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-neon-blue/20 flex items-center justify-center text-primary">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="max-w-[70%] space-y-2">
                  <div className="px-5 py-4 rounded-2xl bg-theme-elevated text-theme-primary rounded-tl-sm">
                    <p className="text-sm leading-relaxed">{databricksConfig.ui.chatbot.welcomeMessage}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                    message.role === 'assistant'
                      ? 'bg-gradient-to-br from-primary/20 to-neon-blue/20 text-primary'
                      : message.role === 'error'
                        ? 'bg-red-500/20 text-red-500'
                        : 'bg-theme-elevated text-theme-secondary'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <Bot className="w-5 h-5" />
                  ) : message.role === 'error' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <div className={`max-w-[70%] space-y-2`}>
                  <div
                    className={`px-5 py-4 rounded-2xl relative group ${
                      message.role === 'assistant'
                        ? 'bg-theme-elevated text-theme-primary rounded-tl-sm'
                        : message.role === 'error'
                          ? 'bg-red-500/10 text-red-300 rounded-tl-sm border border-red-500/20'
                          : 'bg-gradient-to-r from-primary to-neon-blue text-dark rounded-tr-sm'
                    }`}
                  >
                    {/* Copy button for assistant messages */}
                    {message.role === 'assistant' && message.content && (
                      <button
                        onClick={() => handleCopyMessage(message.id, message.content)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-theme-subtle/50 text-theme-muted hover:text-theme-primary hover:bg-theme-subtle opacity-0 group-hover:opacity-100 transition-all"
                        title="Copy message"
                      >
                        {copiedMessageId === message.id ? (
                          <Check className="w-4 h-4 text-primary" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {message.status === 'processing' ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-theme-muted">Thinking...</span>
                      </div>
                    ) : message.role === 'assistant' ? (
                      <div className="text-sm leading-relaxed prose prose-sm prose-invert max-w-none prose-headings:text-theme-primary prose-p:text-theme-primary prose-strong:text-theme-primary prose-li:text-theme-secondary prose-table:text-xs prose-th:text-theme-primary prose-td:text-theme-secondary prose-code:text-primary prose-code:bg-theme-subtle prose-code:px-1 prose-code:rounded pr-8">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    )}
                  </div>
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {message.attachments.map((att, i) => (
                        <span key={i} className="text-xs bg-theme-elevated text-theme-secondary px-2 py-1 rounded-lg flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {att.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className={`text-xs ${
                    message.role === 'user' ? 'text-right text-theme-muted' : message.role === 'error' ? 'text-red-400/60' : 'text-theme-muted'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Suggested prompts (show only for new conversations) */}
            {isNewConversation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4"
              >
                {suggestedPrompts.map((prompt, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="text-left p-4 rounded-xl border border-theme hover:border-primary/30 hover:bg-primary/5 text-sm text-theme-secondary transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-primary mb-2" />
                    {prompt}
                  </motion.button>
                ))}
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="px-6 py-2 border-t border-theme flex flex-wrap gap-2">
              {attachments.map((att, i) => (
                <span key={i} className="text-xs bg-theme-elevated text-theme-secondary px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  {att.name}
                  <button onClick={() => removeAttachment(i)} className="text-theme-muted hover:text-theme-primary">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-theme bg-theme-card/50">
            <div className="flex items-end gap-3">
              {/* Action buttons */}
              <div className="flex gap-1 pb-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={handleFileAttach}
                  className="p-2.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle rounded-lg transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  className="p-2.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle rounded-lg transition-colors"
                  title="Upload image"
                >
                  <Image className="w-5 h-5" />
                </button>
                <button
                  className="p-2.5 text-theme-secondary hover:text-theme-primary hover:bg-theme-subtle rounded-lg transition-colors"
                  title="Voice input"
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>

              {/* Text input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={databricksConfig.ui.chatbot.placeholder}
                disabled={isTyping}
                rows={1}
                className="flex-1 input text-sm disabled:opacity-50 resize-none min-h-[48px] max-h-[120px]"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px'
                }}
              />

              {/* Send button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="p-3 bg-gradient-to-r from-primary to-neon-blue rounded-xl text-dark disabled:opacity-50 disabled:cursor-not-allowed transition-opacity mb-0.5"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
            <p className="text-xs text-theme-muted mt-2 text-center">
              {databricksConfig.ui.chatbot.subtitle}
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
