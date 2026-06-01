import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }

export default function LoadingSpinner({ size = 'md', className }: Props) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={cn(
        sizes[size],
        'border-2 border-brand-700 border-t-brand-400 rounded-full',
        className,
      )}
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" />
    </div>
  )
}
