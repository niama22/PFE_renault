import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  confirmVariant?: 'danger' | 'brand'
  onConfirm: () => void
  loading?: boolean
}

export default function ConfirmDialog({
  open, onOpenChange, title, description,
  confirmLabel = 'Confirmer', confirmVariant = 'brand', onConfirm, loading,
}: Props) {
  const btnClass = confirmVariant === 'danger'
    ? 'bg-red-600 hover:bg-red-500 text-white'
    : 'bg-brand-600 hover:bg-brand-500 text-white'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !loading && onOpenChange(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 glass p-6 w-full max-w-md rounded-2xl shadow-2xl"
          >
            <h2 className="text-slate-100 font-semibold text-base mb-2">{title}</h2>
            <p className="text-slate-400 text-sm mb-6">{description}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-navy-700 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${btnClass} disabled:opacity-50`}
              >
                {loading ? 'Chargement...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
