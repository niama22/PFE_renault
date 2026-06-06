import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn, AlertCircle, Loader2 } from 'lucide-react'
import { login, recordAuditEvent } from '@/lib/axios'
import { useAuthStore } from '@/store/auth.store'
import { useThemeStore } from '@/store/theme.store'
import ThemeToggle from '@/components/shared/ThemeToggle'
import logoLight from '@/optiflow_system_all_-removebg-preview.png'
import logoDark  from '@/Gemini_Generated_Image_mobuuzmobuuzmobu.png'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setTokens, primaryRole } = useAuthStore()
  const { theme } = useThemeStore()
  const isLight = theme === 'light'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const roleRedirect: Record<string, string> = {
    admin:       '/admin/dashboard',
    operateur:   '/operateur/orders',
    responsable: '/responsable/tournees',
    client:      '/client/orders',
    chauffeur:   '/chauffeur/missions',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(username, password)
      setTokens(data.access_token, data.refresh_token)
      const role = primaryRole()
      if (role === 'admin') {
        recordAuditEvent('USER_LOGIN', `Connexion depuis ${navigator.userAgent.split(' ').slice(-1)[0]}`)
      }
      navigate(role ? (roleRedirect[role] ?? '/') : '/')
    } catch (err: any) {
      const msg = err.response?.data?.error_description || err.response?.data?.error
      setError(msg === 'Invalid user credentials' ? 'Identifiants incorrects' : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex transition-colors duration-300"
      style={{ backgroundColor: 'var(--surface-bg)' }}>

      {/* ── LEFT HALF — Branding ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{
          background: isLight
            ? 'linear-gradient(145deg, #ede9fe 0%, #ddd6fe 40%, #c4b5fd 100%)'
            : 'linear-gradient(145deg, #04070f 0%, #0e1525 50%, #1a0b35 100%)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20"
            style={{ background: isLight ? 'radial-gradient(circle, #a78bfa, transparent)' : 'radial-gradient(circle, #7c3aed, transparent)' }} />
          <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full opacity-15"
            style={{ background: isLight ? 'radial-gradient(circle, #8b5cf6, transparent)' : 'radial-gradient(circle, #a855f7, transparent)' }} />
          <div className="absolute top-[40%] right-[-15%] w-[30%] h-[30%] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #6d28d9, transparent)' }} />
          {/* Grid pattern overlay */}
          {!isLight && (
            <div className="absolute inset-0 opacity-5"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23a78bfa' stroke-width='0.5'%3E%3Cpath d='M40 0H0v40'/%3E%3C/g%3E%3C/svg%3E\")" }} />
          )}
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-lg">
          {/* Logo */}
          <motion.img
            src={isLight ? logoLight : logoDark}
            alt="OptiFlow Control"
            className="w-72 h-auto mb-10"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            style={!isLight ? { filter: 'drop-shadow(0 0 32px rgba(168,85,247,0.5))' } : {}}
          />

        </div>

        {/* Bottom copyright */}
        <p className="absolute bottom-6 text-xs" style={{ color: isLight ? '#6d28d9' : 'rgba(167,139,250,0.5)' }}>
          OptiFlow Control © 2026 — Plateforme Logistique
        </p>
      </motion.div>

      {/* ── RIGHT HALF — Login form ───────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex-1 lg:w-1/2 flex flex-col items-center justify-center p-8 relative"
        style={{ backgroundColor: 'var(--surface-bg)' }}
      >
        {/* Theme toggle — top right */}
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        {/* Mobile logo (only visible < lg) */}
        <div className="lg:hidden mb-8">
          <img src={isLight ? logoLight : logoDark} alt="OptiFlow Control"
            className="w-44 h-auto mx-auto"
            style={!isLight ? { filter: 'drop-shadow(0 0 20px rgba(168,85,247,0.4))' } : {}} />
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              Connexion
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Bienvenue sur OptiFlow Control
            </p>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-xl px-4 py-3 mb-6 text-sm"
              style={{
                backgroundColor: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444',
              }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-secondary)' }}>
                Identifiant
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Nom d'utilisateur"
                required
                className="input-dark"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-secondary)' }}>
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-dark pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{
                background: loading
                  ? 'rgba(124,58,237,0.5)'
                  : 'linear-gradient(135deg, #6d28d9, #a855f7)',
                boxShadow: loading ? 'none' : '0 4px 24px rgba(124,58,237,0.35)',
              }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Connexion…</>
                : <><LogIn className="w-4 h-4" /> Se connecter</>
              }
            </button>
          </motion.form>

        </div>
      </motion.div>
    </div>
  )
}
