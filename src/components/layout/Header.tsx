import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Sparkles, Sun, Moon, User } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useUser } from '../../context/UserContext'

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface HeaderProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <motion.div
        className="theme-toggle-knob"
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {theme === 'dark' ? (
          <Moon className="w-3.5 h-3.5 text-white" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-white" />
        )}
      </motion.div>
    </button>
  )
}

function UserAvatar() {
  const { user, loading } = useUser()
  const { theme } = useTheme()

  if (loading) {
    return (
      <div className={`w-9 h-9 rounded-full animate-pulse ${
        theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
      }`} />
    )
  }

  if (!user || user.email === 'unknown') {
    return (
      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
        theme === 'dark' ? 'bg-white/10 text-white/50' : 'bg-black/10 text-black/50'
      }`}>
        <User className="w-4 h-4" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden lg:block text-right">
        <p className="text-sm font-medium text-theme-primary leading-tight">
          {user.displayName || 'User'}
        </p>
      </div>
      <div
        className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-neon-blue flex items-center justify-center text-dark font-semibold text-sm"
        title={user.email}
      >
        {user.initials}
      </div>
    </div>
  )
}

export function Header({ tabs, activeTab, onTabChange }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { theme } = useTheme()

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
          ? theme === 'dark'
            ? 'bg-dark-100/80 backdrop-blur-xl border-b border-white/5'
            : 'bg-white/80 backdrop-blur-xl border-b border-black/5 shadow-sm'
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
            <span className="text-xl font-bold text-theme-primary">
              LogFood<span className="text-gradient">Agent</span>
            </span>
          </motion.div>

          {/* Desktop Navigation Tabs */}
          <nav className={`hidden md:flex items-center gap-1 backdrop-blur-sm rounded-full px-2 py-1 border ${
            theme === 'dark'
              ? 'bg-dark-100/50 border-white/5'
              : 'bg-white/50 border-black/5'
          }`}>
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'text-theme-primary'
                    : 'text-theme-secondary hover:text-theme-primary'
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
            <ThemeToggle />
            <div className="w-px h-6 bg-theme-subtle" />
            <UserAvatar />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-3">
            <ThemeToggle />
            <button
              className="p-2 text-theme-secondary hover:text-theme-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`md:hidden backdrop-blur-xl border-b ${
              theme === 'dark'
                ? 'bg-dark-100/95 border-white/5'
                : 'bg-white/95 border-black/5'
            }`}
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
                      : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-card'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
              {/* User info in mobile menu */}
              <div className="pt-4 border-t border-theme">
                <UserAvatar />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
