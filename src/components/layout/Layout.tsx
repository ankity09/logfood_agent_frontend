import { ReactNode } from 'react'
import { Header } from './Header'
import { Chatbot } from '../chatbot/Chatbot'

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

  return (
    <div className="min-h-screen bg-dark">
      {/* Background effects */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 dot-pattern opacity-30 pointer-events-none" />

      {/* Ambient glow effects */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-1/3 right-1/4 w-80 h-80 bg-neon-blue/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-1/4 left-1/3 w-72 h-72 bg-neon-purple/10 rounded-full blur-[100px] pointer-events-none" />

      <Header tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

      <main className="relative pt-16 min-h-screen">
        {children}
      </main>

      {showChatbot && <Chatbot />}
    </div>
  )
}
