import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/store/theme.store'

interface Props {
  className?: string
}

export default function ThemeToggle({ className = '' }: Props) {
  const { theme, toggleTheme } = useThemeStore()
  const isLight = theme === 'light'

  return (
    <button
      onClick={toggleTheme}
      aria-label="Basculer le thème"
      className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex items-center px-0.5 ${
        isLight
          ? 'bg-brand-200 border border-brand-300'
          : 'bg-navy-700 border border-brand-700/40'
      } ${className}`}
    >
      <span className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 shadow ${
        isLight
          ? 'translate-x-6 bg-brand-600'
          : 'translate-x-0 bg-navy-500'
      }`}>
        {isLight
          ? <Sun className="w-3 h-3 text-white" />
          : <Moon className="w-3 h-3 text-brand-300" />
        }
      </span>
    </button>
  )
}
