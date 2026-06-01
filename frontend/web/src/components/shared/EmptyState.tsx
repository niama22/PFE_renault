import { motion } from 'framer-motion'
import { Inbox } from 'lucide-react'

interface Props {
  title?: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({
  title = 'Aucun résultat',
  description = 'Il n\'y a rien à afficher pour le moment.',
  action,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-brand-600/10 border border-brand-500/15 flex items-center justify-center mb-4">
        <Inbox className="w-7 h-7 text-brand-500" />
      </div>
      <p className="text-slate-300 font-semibold text-sm mb-1">{title}</p>
      <p className="text-slate-500 text-xs max-w-xs">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}
