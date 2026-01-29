import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
}

export function Card({ children, className = '', hover = true, glow = false }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`
        glass-card p-6
        ${glow ? 'glow-border' : ''}
        ${hover ? 'card-hover cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
}

export function StatCard({ title, value, change, icon, trend = 'neutral' }: StatCardProps) {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400',
  }

  const trendBg = {
    up: 'bg-green-400/10',
    down: 'bg-red-400/10',
    neutral: 'bg-gray-400/10',
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${trendBg[trend]}`}>
            {icon}
          </div>
          {change !== undefined && (
            <span className={`text-sm font-medium ${trendColors[trend]}`}>
              {change > 0 ? '+' : ''}{change}%
            </span>
          )}
        </div>

        <p className="text-theme-secondary text-sm mb-1">{title}</p>
        <p className="text-3xl font-bold text-theme-primary">{value}</p>
      </div>
    </Card>
  )
}

interface ChartCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  actions?: ReactNode
}

export function ChartCard({ title, subtitle, children, actions }: ChartCardProps) {
  return (
    <Card hover={false} className="h-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-theme-primary">{title}</h3>
          {subtitle && <p className="text-sm text-theme-secondary mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </Card>
  )
}
