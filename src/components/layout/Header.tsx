import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Sparkles } from 'lucide-react'

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface HeaderProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  onDocumentationClick?: () => void
}

export function Header({ tabs, activeTab, onTabChange, onDocumentationClick }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-dark-100/80 backdrop-blur-xl border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-neon-blue flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-dark" />
              </div>
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary to-neon-blue opacity-30 blur-lg -z-10" />
            </div>
            <span className="text-xl font-bold text-white">
              LogFood<span className="text-gradient">Agent</span>
            </span>
          </motion.div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-dark-100/50 backdrop-blur-sm rounded-full px-2 py-1 border border-white/5">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-primary/20 to-neon-blue/20 rounded-full border border-primary/30"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                </span>
              </motion.button>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="hidden md:flex items-center gap-4">
            <button
              className="btn-ghost text-sm"
              onClick={() => onDocumentationClick ? onDocumentationClick() : onTabChange('documentation')}
            >
              Documentation
            </button>
            <button
              className="btn-primary text-sm"
              onClick={() => onTabChange('usecases')}
            >
              Get Started
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-dark-100/95 backdrop-blur-xl border-b border-white/5"
          >
            <div className="px-4 py-4 space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id)
                    setIsMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <button
                  className="w-full btn-ghost text-left"
                  onClick={() => {
                    onDocumentationClick ? onDocumentationClick() : onTabChange('documentation')
                    setIsMobileMenuOpen(false)
                  }}
                >
                  Documentation
                </button>
                <button
                  className="w-full btn-primary"
                  onClick={() => {
                    onTabChange('usecases')
                    setIsMobileMenuOpen(false)
                  }}
                >
                  Get Started
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
