import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Minimize2,
  Maximize2,
  Bot,
  User,
  AlertCircle,
} from 'lucide-react'
import { databricksConfig } from '../../config'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant' | 'error'
  timestamp: Date
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

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
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
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
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-neon-blue flex items-center justify-center shadow-glow-lg hover:shadow-[0_0_50px_rgba(0,229,153,0.5)] transition-shadow duration-300"
          >
            <MessageCircle className="w-6 h-6 text-dark" />
            <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-30" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
            className={`fixed z-50 bg-dark-100 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
              isExpanded
                ? 'bottom-4 right-4 left-4 top-4 md:left-auto md:w-[500px] md:h-[700px]'
                : 'bottom-6 right-6 w-[380px] h-[500px]'
            } transition-all duration-300`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-dark-50 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-neon-blue flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-dark" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-50" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {databricksConfig.ui.chatbot.title}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {databricksConfig.ui.chatbot.subtitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-xs"
                  title="Clear chat"
                >
                  Clear
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      message.role === 'assistant'
                        ? 'bg-gradient-to-br from-primary/20 to-neon-blue/20 text-primary'
                        : message.role === 'error'
                          ? 'bg-red-500/20 text-red-500'
                          : 'bg-dark-50 text-gray-400'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <Bot className="w-4 h-4" />
                    ) : message.role === 'error' ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                      message.role === 'assistant'
                        ? 'bg-dark-50 text-gray-100 rounded-tl-sm'
                        : message.role === 'error'
                          ? 'bg-red-500/10 text-red-300 rounded-tl-sm border border-red-500/20'
                          : 'bg-gradient-to-r from-primary to-neon-blue text-dark rounded-tr-sm'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="text-sm prose prose-sm prose-invert max-w-none prose-headings:text-gray-100 prose-p:text-gray-100 prose-strong:text-white prose-li:text-gray-200 prose-table:text-xs prose-th:text-gray-100 prose-td:text-gray-200 prose-code:text-primary prose-code:bg-dark-100 prose-code:px-1 prose-code:rounded">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    <p
                      className={`text-xs mt-1 ${
                        message.role === 'user'
                          ? 'text-dark/60'
                          : message.role === 'error'
                            ? 'text-red-400/60'
                            : 'text-gray-500'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-neon-blue/20 flex items-center justify-center text-primary">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-dark-50 px-4 py-3 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5 bg-dark-100">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={databricksConfig.ui.chatbot.placeholder}
                  disabled={isTyping}
                  className="flex-1 input text-sm disabled:opacity-50"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="p-3 bg-gradient-to-r from-primary to-neon-blue rounded-lg text-dark disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {databricksConfig.ui.chatbot.subtitle}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
