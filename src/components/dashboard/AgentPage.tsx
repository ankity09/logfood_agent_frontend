import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
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
} from 'lucide-react'
import { databricksConfig } from '../../config'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant' | 'error'
  timestamp: Date
  attachments?: { name: string; type: string }[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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

export function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: databricksConfig.ui.chatbot.welcomeMessage,
      role: 'assistant',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [attachments, setAttachments] = useState<{ name: string; type: string }[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const getChatHistory = (): ChatMessage[] => {
    return messages
      .filter((m) => m.role !== 'error')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
  }

  const handleSend = async () => {
    if (!input.trim() || isTyping) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setAttachments([])
    setIsTyping(true)

    try {
      const chatHistory = getChatHistory()
      chatHistory.push({ role: 'user', content: input })

      const response = await fetch(
        `${databricksConfig.api.baseUrl}${databricksConfig.api.chatEndpoint}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: chatHistory }),
        }
      )

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.message || 'I received your message but could not generate a response.',
        role: 'assistant',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error('Chat error:', error)

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but I encountered an error connecting to the AI service. Please try again later.',
        role: 'error',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
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

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        content: databricksConfig.ui.chatbot.welcomeMessage,
        role: 'assistant',
        timestamp: new Date(),
      },
    ])
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 lg:p-8 h-[calc(100vh-64px)] flex flex-col"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Agent</h1>
          <p className="text-gray-400 mt-1">Your intelligent assistant for account management.</p>
        </div>
        <button onClick={clearChat} className="btn-ghost text-sm">
          Clear Chat
        </button>
      </motion.div>

      {/* Chat Container */}
      <motion.div
        variants={itemVariants}
        className="flex-1 glass-card overflow-hidden flex flex-col"
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
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
                      : 'bg-dark-50 text-gray-400'
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
                  className={`px-5 py-4 rounded-2xl ${
                    message.role === 'assistant'
                      ? 'bg-dark-50 text-gray-100 rounded-tl-sm'
                      : message.role === 'error'
                        ? 'bg-red-500/10 text-red-300 rounded-tl-sm border border-red-500/20'
                        : 'bg-gradient-to-r from-primary to-neon-blue text-dark rounded-tr-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {message.attachments.map((att, i) => (
                      <span key={i} className="text-xs bg-dark-50 text-gray-400 px-2 py-1 rounded-lg flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {att.name}
                      </span>
                    ))}
                  </div>
                )}
                <p className={`text-xs ${
                  message.role === 'user' ? 'text-right text-gray-500' : message.role === 'error' ? 'text-red-400/60' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-neon-blue/20 flex items-center justify-center text-primary">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-dark-50 px-5 py-4 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Suggested prompts (show only when conversation is fresh) */}
          {messages.length <= 1 && (
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
                  className="text-left p-4 rounded-xl border border-white/10 hover:border-primary/30 hover:bg-primary/5 text-sm text-gray-300 transition-all"
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
          <div className="px-6 py-2 border-t border-white/5 flex flex-wrap gap-2">
            {attachments.map((att, i) => (
              <span key={i} className="text-xs bg-dark-50 text-gray-300 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <FileText className="w-3 h-3" />
                {att.name}
                <button onClick={() => removeAttachment(i)} className="text-gray-500 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-white/5 bg-dark-100/50">
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
                className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Upload image"
              >
                <Image className="w-5 h-5" />
              </button>
              <button
                className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
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
          <p className="text-xs text-gray-500 mt-2 text-center">
            {databricksConfig.ui.chatbot.subtitle}
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
