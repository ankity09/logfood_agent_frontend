import { motion } from 'framer-motion'
import {
  BookOpen,
  Target,
  FileText,
  Bot,
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  ChevronRight,
  Zap,
  Shield,
  Database,
} from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  features: string[]
}

function FeatureCard({ icon, title, description, features }: FeatureCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className="glass-card p-6 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-neon-blue/20 border border-primary/20">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-theme-primary mb-2">{title}</h3>
          <p className="text-theme-secondary text-sm mb-4">{description}</p>
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-theme-secondary">
                <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  )
}

export function DocumentationPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
          <BookOpen className="w-4 h-4" />
          <span>Documentation</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-theme-primary mb-4">
          Welcome to <span className="text-gradient">LogFoodAgent</span>
        </h1>
        <p className="text-xl text-theme-secondary max-w-2xl mx-auto">
          Your AI-powered solution for managing accounts, tracking use cases, and generating
          professional Salesforce updates with ease.
        </p>
      </motion.div>

      {/* Quick Start */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mb-12"
      >
        <motion.div variants={itemVariants} className="glass-card p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-neon-purple to-primary">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-theme-primary">Quick Start</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-theme-elevated border border-theme">
              <div className="text-3xl font-bold text-primary mb-2">1</div>
              <h3 className="font-semibold text-theme-primary mb-1">Explore Overview</h3>
              <p className="text-sm text-theme-secondary">
                Start with the Overview tab to see your embedded Databricks AI/BI dashboard with
                key metrics and insights.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-theme-elevated border border-theme">
              <div className="text-3xl font-bold text-primary mb-2">2</div>
              <h3 className="font-semibold text-theme-primary mb-1">Manage Use Cases</h3>
              <p className="text-sm text-theme-secondary">
                Track your sales opportunities in the Use Cases tab. Use the AI Update Generator
                to create professional Salesforce updates.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-theme-elevated border border-theme">
              <div className="text-3xl font-bold text-primary mb-2">3</div>
              <h3 className="font-semibold text-theme-primary mb-1">Chat with Agent</h3>
              <p className="text-sm text-theme-secondary">
                Ask questions about your accounts and use cases using the AI Agent powered by
                Databricks Model Serving.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        <motion.h2
          variants={itemVariants}
          className="text-2xl font-bold text-theme-primary flex items-center gap-3"
        >
          <Database className="w-6 h-6 text-primary" />
          Features & Capabilities
        </motion.h2>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Overview Dashboard */}
          <FeatureCard
            icon={<LayoutDashboard className="w-6 h-6 text-primary" />}
            title="Overview Dashboard"
            description="View your embedded Databricks AI/BI dashboard directly within LogFoodAgent for real-time analytics and insights."
            features={[
              'Embedded Databricks dashboard with seamless authentication',
              'Real-time metrics and KPIs from your data lakehouse',
              'Interactive visualizations powered by Databricks SQL',
              'Automatic token refresh for uninterrupted access',
            ]}
          />

          {/* AI Agent */}
          <FeatureCard
            icon={<Bot className="w-6 h-6 text-neon-blue" />}
            title="AI Agent Assistant"
            description="Chat with an AI assistant powered by Databricks Model Serving to get answers about your accounts and use cases."
            features={[
              'Natural language queries about your data',
              'Context-aware responses using your account information',
              'Powered by Claude via Databricks Model Serving',
              'Quick insights without writing SQL queries',
            ]}
          />

          {/* Use Cases */}
          <FeatureCard
            icon={<Target className="w-6 h-6 text-neon-purple" />}
            title="Use Cases Management"
            description="Track and manage your sales opportunities through their lifecycle with rich details and AI-powered update generation."
            features={[
              'Visual pipeline with stage progression tracking',
              'Rich descriptions with formatted sections',
              'Timestamped activity log for next steps',
              'Filter by stage, search by title or account',
              'View deal value and target go-live dates',
              'Track stakeholders and Databricks services',
            ]}
          />

          {/* AI Update Generator */}
          <FeatureCard
            icon={<Sparkles className="w-6 h-6 text-neon-purple" />}
            title="AI Update Generator"
            description="Transform your raw meeting notes into professional, timestamped Salesforce updates with one click."
            features={[
              'Paste raw notes or observations into the text area',
              'AI generates formatted update with date and initials',
              'Includes context from use case details automatically',
              'Edit the generated update before copying',
              'One-click copy to clipboard for Salesforce',
              'Consistent format: "MM/DD/YY [initials] - [update]"',
            ]}
          />

          {/* Meeting Notes */}
          <FeatureCard
            icon={<FileText className="w-6 h-6 text-green-400" />}
            title="Meeting Notes Processing"
            description="Upload meeting notes and let AI extract actionable use cases and key information automatically."
            features={[
              'Drag-and-drop file upload (.txt, .md, .docx, .pdf)',
              'AI extracts use cases from meeting content',
              'View summary, attendees, and extracted opportunities',
              'Copy individual use cases or export all at once',
              'Expandable cards for detailed review',
            ]}
          />

          {/* Data Storage */}
          <FeatureCard
            icon={<Shield className="w-6 h-6 text-yellow-400" />}
            title="Secure Data Storage"
            description="All your data is securely stored in Databricks Lakebase with enterprise-grade security."
            features={[
              'PostgreSQL-compatible serverless database',
              'Data stored in your Databricks workspace',
              'Secure authentication via Databricks OAuth',
              'Full audit trail of all changes',
            ]}
          />
        </div>
      </motion.div>

      {/* Use Case Stages */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12"
      >
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-neon-blue/20">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-theme-primary">Use Case Stages</h2>
          </div>
          <p className="text-theme-secondary mb-6">
            Track your opportunities through these stages from initial discovery to production:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'Scoping', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
              { name: 'Validating', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
              { name: 'Evaluating', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
              { name: 'Confirming', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
              { name: 'Onboarding', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
              { name: 'Live', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
            ].map((stage, index) => (
              <div
                key={stage.name}
                className={`p-4 rounded-xl border ${stage.color} text-center`}
              >
                <div className="text-2xl font-bold mb-1">{index + 1}</div>
                <div className="font-medium">{stage.name}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Tips Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-12"
      >
        <div className="glass-card p-6 bg-gradient-to-br from-primary/5 to-neon-purple/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-gradient-to-br from-neon-purple to-primary">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-theme-primary">Pro Tips</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-theme-primary flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                AI Update Generator
              </h3>
              <ul className="space-y-2 text-sm text-theme-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Include specific details like names, dates, and action items in your raw notes
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  The AI automatically includes your initials and today's date
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Edit the generated update to add any missing context before copying
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-theme-primary flex items-center gap-2">
                <Bot className="w-4 h-4 text-neon-blue" />
                AI Agent
              </h3>
              <ul className="space-y-2 text-sm text-theme-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-neon-blue">•</span>
                  Ask specific questions like "What use cases are in the confirming stage?"
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-blue">•</span>
                  Request summaries: "Summarize the status of Acme Corporation"
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neon-blue">•</span>
                  Get insights: "Which accounts have the highest value opportunities?"
                </li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-12 text-center text-theme-muted text-sm"
      >
        <p>
          LogFoodAgent is powered by{' '}
          <span className="text-primary">Databricks</span> — Model Serving, AI/BI Dashboards, and
          Lakebase
        </p>
      </motion.div>
    </div>
  )
}
