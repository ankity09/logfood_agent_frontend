import { ReactNode } from 'react'
import { Header } from './Header'
import { Chatbot } from '../chatbot/Chatbot'
import { useTheme } from '../../context/ThemeContext'

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface LayoutProps {
  children: ReactNode
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function Layout({ children, tabs, activeTab, onTabChange }: LayoutProps) {
  const showChatbot = activeTab !== 'agent'
  const { theme } = useTheme()

  return (
    <div className="min-h-screen bg-theme transition-colors duration-300">
      {/* Background effects */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 dot-pattern opacity-30 pointer-events-none" />

      {/* Ambient glow effects - slightly reduced in light mode via CSS */}
      <div className={`fixed top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-opacity duration-300 ${
        theme === 'dark' ? 'bg-primary/10' : 'bg-primary/5'
      }`} />
      <div className={`fixed top-1/3 right-1/4 w-80 h-80 rounded-full blur-[100px] pointer-events-none transition-opacity duration-300 ${
        theme === 'dark' ? 'bg-neon-blue/10' : 'bg-neon-blue/5'
      }`} />
      <div className={`fixed bottom-1/4 left-1/3 w-72 h-72 rounded-full blur-[100px] pointer-events-none transition-opacity duration-300 ${
        theme === 'dark' ? 'bg-neon-purple/10' : 'bg-neon-purple/5'
      }`} />

      <Header tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

      <main className="relative pt-16 min-h-screen">
        {children}
      </main>

      {showChatbot && <Chatbot />}
    </div>
  )
}
