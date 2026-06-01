import { Bell } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import ThemeToggle from '@/components/shared/ThemeToggle'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuthStore()

  return (
    <header
      className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 backdrop-blur-md transition-colors duration-300"
      style={{
        backgroundColor: 'var(--surface-header)',
        borderBottom: '1px solid var(--border-section)',
      }}
    >
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <button
          className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-all"
          style={{
            backgroundColor: 'var(--surface-badge)',
            border: '1px solid var(--border-card)',
            color: 'var(--text-secondary)',
          }}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full" />
        </button>

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
        >
          {user?.firstName?.[0] ?? user?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
      </div>
    </header>
  )
}
