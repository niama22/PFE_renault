import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, Truck, ScrollText, Package,
  MapPin, AlertTriangle, Route, CheckSquare, Activity,
  ShoppingCart, FileText, LogOut, ChevronRight, UserCircle,
  Car, Zap, Ban,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { useThemeStore } from '@/store/theme.store'
import { useProfileStore } from '@/store/profile.store'
import { cn } from '@/lib/utils'
import logoLight from '@/optiflow_system_all_-removebg-preview.png'
import logoDark  from '@/Gemini_Generated_Image_mobuuzmobuuzmobu.png'
import type { Role } from '@/types'

interface NavSection {
  label: string
  items: { to: string; icon: React.ElementType; label: string }[]
}

const navByRole: Record<Role, NavSection[]> = {
  admin: [{
    label: 'Administration',
    items: [
      { to: '/admin/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/users',          icon: Users,           label: 'Utilisateurs' },
      { to: '/admin/audit',          icon: ScrollText,      label: 'Audit Logs' },
    ],
  }],
  operateur: [
    {
      label: 'Tableau de bord',
      items: [
        { to: '/operateur/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
      ],
    },
    {
      label: 'Opérations',
      items: [
        { to: '/operateur/orders',        icon: Package,       label: 'Commandes' },
        { to: '/operateur/tournees',      icon: Route,         label: 'Tournées' },
        { to: '/operateur/incidents',     icon: AlertTriangle, label: 'Incidents' },
        { to: '/operateur/cancellations', icon: Ban,           label: 'Annulations' },
      ],
    },
    {
      label: 'Planification',
      items: [
        { to: '/operateur/optimization', icon: Zap, label: 'Optimisation' },
      ],
    },
  ],
  responsable: [
    {
      label: 'Supervision',
      items: [
        { to: '/responsable/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/responsable/supervision', icon: Activity,        label: 'Supervision ops.' },
        { to: '/responsable/tournees',    icon: CheckSquare,     label: 'Valider le plan' },
        { to: '/responsable/incidents',     icon: AlertTriangle, label: 'Incidents' },
        { to: '/responsable/cancellations', icon: Ban,           label: 'Annulations' },
      ],
    },
    {
      label: 'Référentiels',
      items: [
        { to: '/responsable/trucks',              icon: Truck, label: 'Flotte camions' },
        { to: '/responsable/vehicle-models',      icon: Car,   label: 'Modèles véhicules' },
        { to: '/responsable/optimization-config', icon: Zap,   label: 'Config moteur' },
      ],
    },
  ],
  client: [{
    label: 'Mon Espace',
    items: [
      { to: '/client/orders',    icon: ShoppingCart, label: 'Mes Commandes' },
      { to: '/client/incidents', icon: FileText,     label: 'Mes Incidents' },
      { to: '/client/profile',   icon: UserCircle,   label: 'Mon Profil' },
    ],
  }],
  chauffeur: [{
    label: 'Missions',
    items: [
      { to: '/chauffeur/missions', icon: MapPin, label: 'Mes Missions' },
    ],
  }],
}

export default function Sidebar() {
  const { user, logout, primaryRole } = useAuthStore()
  const { theme } = useThemeStore()
  const { clearProfile } = useProfileStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const role = primaryRole()
  const sections = role ? (navByRole[role] ?? []) : []
  const isLight = theme === 'light'

  function handleLogout() {
    logout()
    clearProfile()
    qc.clear()
    navigate('/login')
  }

  const roleLabel: Record<Role, string> = {
    admin: 'Administrateur', operateur: 'Opérateur',
    responsable: 'Responsable', client: 'Client', chauffeur: 'Chauffeur',
  }
  const roleColor: Record<Role, string> = {
    admin: 'text-brand-400', operateur: 'text-blue-400',
    responsable: 'text-emerald-400', client: 'text-amber-400', chauffeur: 'text-purple-400',
  }

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-64 min-h-screen flex flex-col transition-colors duration-300"
      style={{
        background: isLight
          ? 'linear-gradient(180deg, #ffffff 0%, #f8faff 100%)'
          : 'linear-gradient(180deg, #070b12 0%, #080c14 100%)',
        borderRight: `1px solid var(--border-sidebar)`,
      }}
    >
      {/* Logo */}
      <div className="px-4 py-4 flex items-center justify-center" style={{ borderBottom: '1px solid var(--border-section)' }}>
        <img
          src={isLight ? logoLight : logoDark}
          alt="OptiFlow Control"
          className="w-28 h-auto"
          style={!isLight ? { filter: 'drop-shadow(0 0 10px rgba(168,85,247,0.55))' } : {}}
        />
      </div>

      {/* User badge */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border-section)' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
          style={{ backgroundColor: isLight ? 'rgba(124,58,237,0.06)' : 'rgba(20,30,53,0.6)' }}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
          >
            {user?.firstName?.[0] ?? user?.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate leading-tight text-slate-200">
              {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user?.username}
            </p>
            <p className={cn('text-xs leading-tight', role ? roleColor[role] : 'text-slate-500')}>
              {role ? roleLabel[role] : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
        {sections.map(section => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] px-3 mb-2"
              style={{ color: 'var(--text-muted)' }}>
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cn('nav-item', isActive && 'active')}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cn('w-4 h-4 flex-shrink-0',
                        isActive ? 'text-brand-400' : '')} style={isActive ? {} : { color: 'var(--text-muted)' }} />
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="w-3 h-3 text-brand-500" />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border-section)' }}>
        <button
          onClick={handleLogout}
          className="nav-item w-full hover:bg-red-500/10 hover:!text-red-500 group"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 group-hover:text-red-500" style={{ color: 'var(--text-muted)' }} />
          <span>Déconnexion</span>
        </button>
      </div>
    </motion.aside>
  )
}
