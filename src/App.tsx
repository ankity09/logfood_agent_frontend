import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutDashboard, Bot, Target, FileText, BookOpen } from 'lucide-react'
import { Layout } from './components/layout/Layout'
import { OverviewDashboard } from './components/dashboard/OverviewDashboard'
import { AgentPage } from './components/dashboard/AgentPage'
import { UseCasesPage } from './components/dashboard/UseCasesPage'
import { MeetingNotesPage } from './components/dashboard/MeetingNotesPage'
import { DocumentationPage } from './components/dashboard/DocumentationPage'

const tabs = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'agent', label: 'Research Agent', icon: <Bot className="w-4 h-4" /> },
  { id: 'usecases', label: 'Use Cases', icon: <Target className="w-4 h-4" /> },
  { id: 'meetingnotes', label: 'Meeting Notes', icon: <FileText className="w-4 h-4" /> },
  { id: 'documentation', label: 'Docs', icon: <BookOpen className="w-4 h-4" /> },
]

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

function App() {
  const [activeTab, setActiveTab] = useState('overview')

  const renderPage = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewDashboard />
      case 'agent':
        return <AgentPage />
      case 'usecases':
        return <UseCasesPage />
      case 'meetingnotes':
        return <MeetingNotesPage />
      case 'documentation':
        return <DocumentationPage />
      default:
        return <OverviewDashboard />
    }
  }

  return (
    <Layout tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  )
}

export default App
