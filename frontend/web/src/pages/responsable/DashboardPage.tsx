import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Route, CheckCircle2, Clock, Truck, TrendingUp,
  AlertCircle, Activity, ChevronRight,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { getResponsableStats, getTourneesResponsable } from '@/api/responsable.api'
import Header from '@/components/layout/Header'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatDateTime } from '@/lib/utils'
import type { Tournee } from '@/types'

function StatCard({
  title, value, icon: Icon, color, sub, delay = 0,
}: {
  title: string; value: number; icon: React.ElementType
  color: string; sub?: string; delay?: number
}) {
  const colors: Record<string, { bg: string; icon: string; glow: string }> = {
    amber:   { bg: 'bg-amber-500/10 border-amber-500/20',   icon: 'text-amber-400',   glow: '0 0 20px rgba(245,158,11,0.15)' },
    emerald: { bg: 'bg-emerald-500/10 border-emerald-500/20', icon: 'text-emerald-400', glow: '0 0 20px rgba(16,185,129,0.15)' },
    blue:    { bg: 'bg-blue-500/10 border-blue-500/20',     icon: 'text-blue-400',     glow: '0 0 20px rgba(59,130,246,0.15)' },
    brand:   { bg: 'bg-brand-500/10 border-brand-500/20',   icon: 'text-brand-400',   glow: '0 0 20px rgba(124,58,237,0.15)' },
    slate:   { bg: 'bg-slate-500/10 border-slate-500/20',   icon: 'text-slate-400',   glow: '0 0 12px rgba(100,116,139,0.1)' },
  }
  const c = colors[color] ?? colors.brand
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass-hover p-5"
      style={{ boxShadow: c.glow }}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border mb-4 ${c.bg}`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <p className="text-2xl font-bold text-slate-200 mb-1">{value.toLocaleString('fr-FR')}</p>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </motion.div>
  )
}

export default function ResponsableDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['responsable-stats'],
    queryFn: getResponsableStats,
    refetchInterval: 30_000,
  })

  const { data: pending = [], isLoading: pendingLoading } = useQuery<Tournee[]>({
    queryKey: ['responsable-tournees-pending'],
    queryFn: () => getTourneesResponsable('PENDING_RESPONSABLE_VALIDATION'),
    refetchInterval: 30_000,
  })

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Tableau de bord" subtitle="Vue d'ensemble — responsable logistique" />

      <div className="flex-1 p-6 space-y-6">

        {/* Stats */}
        {statsLoading ? <PageLoader /> : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="En attente de validation" value={stats?.pendingValidation ?? 0}
              icon={Clock} color="amber" sub="À traiter" delay={0.05} />
            <StatCard title="Validées aujourd'hui" value={stats?.validatedToday ?? 0}
              icon={CheckCircle2} color="emerald" delay={0.1} />
            <StatCard title="En cours de livraison" value={stats?.inProgress ?? 0}
              icon={TrendingUp} color="blue" delay={0.15} />
            <StatCard title="Terminées" value={stats?.completed ?? 0}
              icon={Activity} color="slate" delay={0.2} />
          </div>
        )}

        {/* Secondary stats */}
        <div className="grid grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }} className="glass p-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Route className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-200">{(stats?.total ?? 0).toLocaleString('fr-FR')}</p>
              <p className="text-xs text-slate-500">Total tournées</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }} className="glass p-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Truck className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-200">{(stats?.assigned ?? 0).toLocaleString('fr-FR')}</p>
              <p className="text-xs text-slate-500">Assignées (non soumises)</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }} className="glass p-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-200">{(stats?.validated ?? 0).toLocaleString('fr-FR')}</p>
              <p className="text-xs text-slate-500">Total validées</p>
            </div>
          </motion.div>
        </div>

        {/* Pending tournées — quick access */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }} className="glass overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--border-row)' }}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Tournées en attente de validation
                {pending.length > 0 && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
                    {pending.length}
                  </span>
                )}
              </h3>
            </div>
            <NavLink to="/responsable/tournees"
              className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Voir toutes <ChevronRight className="w-3 h-3" />
            </NavLink>
          </div>

          {pendingLoading ? (
            <div className="p-6"><PageLoader /></div>
          ) : pending.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
              <p className="text-sm text-slate-400">Aucune tournée en attente — tout est à jour !</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-row)' }}>
              {pending.slice(0, 5).map((t, i) => (
                <motion.div key={t.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.04 }}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-white/2 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Route className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {t.tourneeNumber ?? `#${t.id.substring(0, 8)}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t.chauffeurName ? `Chauffeur : ${t.chauffeurName}` : 'Sans chauffeur'}
                        {t.plannedDate ? ` · ${t.plannedDate}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={t.status} />
                    <p className="text-xs text-slate-600">{formatDateTime(t.createdAt)}</p>
                  </div>
                </motion.div>
              ))}
              {pending.length > 5 && (
                <div className="px-5 py-3 text-xs text-slate-500 text-center">
                  + {pending.length - 5} autres tournées en attente
                </div>
              )}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}
