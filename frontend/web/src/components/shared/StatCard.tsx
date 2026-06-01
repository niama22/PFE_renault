import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number
  subtitle?: string
  icon: React.ElementType
  color?: 'brand' | 'blue' | 'emerald' | 'amber' | 'red' | 'slate'
  trend?: { value: number; label: string }
  delay?: number
}

const colorMap = {
  brand:   { bg: 'bg-brand-600/15',   border: 'border-brand-500/25',   icon: 'text-brand-400',   glow: '0 0 20px rgba(124,58,237,0.2)' },
  blue:    { bg: 'bg-blue-600/15',    border: 'border-blue-500/25',    icon: 'text-blue-400',    glow: '0 0 20px rgba(59,130,246,0.2)' },
  emerald: { bg: 'bg-emerald-600/15', border: 'border-emerald-500/25', icon: 'text-emerald-400', glow: '0 0 20px rgba(16,185,129,0.2)' },
  amber:   { bg: 'bg-amber-600/15',   border: 'border-amber-500/25',   icon: 'text-amber-400',   glow: '0 0 20px rgba(245,158,11,0.2)' },
  red:     { bg: 'bg-red-600/15',     border: 'border-red-500/25',     icon: 'text-red-400',     glow: '0 0 20px rgba(239,68,68,0.2)' },
  slate:   { bg: 'bg-slate-600/15',   border: 'border-slate-500/25',   icon: 'text-slate-400',   glow: '0 0 20px rgba(100,116,139,0.15)' },
}

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, v => Math.round(v).toLocaleString('fr-FR'))

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.2, delay, ease: 'easeOut' })
    return controls.stop
  }, [value, delay, count])

  return <motion.span>{rounded}</motion.span>
}

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'brand', trend, delay = 0 }: StatCardProps) {
  const c = colorMap[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn('glass-hover p-5 cursor-default')}
      style={{ boxShadow: `${c.glow}, 0 4px 24px rgba(0,0,0,0.3)` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', c.bg, 'border', c.border)}>
          <Icon className={cn('w-5 h-5', c.icon)} />
        </div>
        {trend && (
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            trend.value >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
          )}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
      </div>

      <div className="stat-number text-2xl mb-1">
        <AnimatedNumber value={value} delay={delay} />
      </div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </motion.div>
  )
}
