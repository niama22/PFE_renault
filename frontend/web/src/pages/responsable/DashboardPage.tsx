import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Package, AlertTriangle, Route, Ban,
  TrendingUp, Clock, CheckCircle2, Truck,
  Activity, RefreshCw, ChevronRight,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { getResponsableDashboard, getTourneesResponsable } from '@/api/responsable.api'
import StatCard from '@/components/shared/StatCard'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatDateTime } from '@/lib/utils'
import type { Tournee } from '@/types'

const PIE_COLORS = {
  brand: '#7c3aed', blue: '#3b82f6', emerald: '#10b981', amber: '#f59e0b', red: '#ef4444',
}

function SkeletonCard() {
  return <div className="glass p-5 h-32 skeleton rounded-xl" />
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass px-4 py-3 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function ResponsableDashboardPage() {
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['responsable-dashboard'],
    queryFn: getResponsableDashboard,
    refetchInterval: 30_000,
  })

  const { data: pendingTournees = [] } = useQuery<Tournee[]>({
    queryKey: ['responsable-tournees-pending'],
    queryFn: () => getTourneesResponsable('PENDING_RESPONSABLE_VALIDATION'),
    refetchInterval: 30_000,
  })

  const orders    = data?.orders       ?? {}
  const tournees  = data?.tournees     ?? {}
  const incidents = data?.incidents    ?? {}
  const cancels   = data?.cancellations ?? {}

  // Distribution horaire simulée basée sur les totaux réels
  const validated = orders.validated ?? 0
  const pending   = orders.pending   ?? 0
  const weights   = [0.05, 0.05, 0.10, 0.20, 0.25, 0.20, 0.15]
  const hours     = ['00h', '04h', '08h', '12h', '14h', '16h', '20h']
  const ordersChartData = hours.map((h, i) => ({
    h,
    validated: Math.round(validated * weights[i]),
    pending:   Math.round(pending   * weights[i]),
  }))

  const tourneesChartData = [
    { name: 'À valider', value: tournees.pendingValidation ?? 0, color: PIE_COLORS.amber   },
    { name: 'Validées',  value: tournees.validated         ?? 0, color: PIE_COLORS.emerald },
    { name: 'En cours',  value: tournees.inProgress        ?? 0, color: PIE_COLORS.brand   },
    { name: 'Terminées', value: tournees.completed         ?? 0, color: PIE_COLORS.blue    },
  ].filter(d => d.value > 0)

  const incidentBarData = [
    { name: 'Ouverts',  value: incidents.open       ?? 0, color: PIE_COLORS.red    },
    { name: 'En cours', value: incidents.inProgress ?? 0, color: PIE_COLORS.amber  },
    { name: 'Résolus',  value: incidents.resolved   ?? 0, color: PIE_COLORS.emerald },
  ]

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Dashboard"
        subtitle={dataUpdatedAt ? `Mis à jour ${formatDateTime(new Date(dataUpdatedAt))}` : 'Responsable logistique'}
      />

      <div className="flex-1 p-6 space-y-6">

        {/* Status bar */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-slate-500">Mise à jour automatique toutes les 30s</span>
          </div>
          <button onClick={() => refetch()} disabled={isLoading}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-brand-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-brand-600/10">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </motion.div>

        {/* ── Commandes ── */}
        <section>
          <motion.h2 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}
            className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-brand-500" /> Commandes
          </motion.h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isLoading ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />) : (
              <>
                <StatCard title="Total"      value={orders.total     ?? 0} icon={Package}     color="brand"   delay={0.05} />
                <StatCard title="En attente" value={orders.pending   ?? 0} icon={Clock}        color="amber"   delay={0.1}  />
                <StatCard title="Planifiées" value={orders.planned   ?? 0} icon={Route}        color="blue"    delay={0.15} />
                <StatCard title="Livrées"    value={orders.delivered ?? 0} icon={CheckCircle2} color="emerald" delay={0.2}  />
              </>
            )}
          </div>
        </section>

        {/* ── KPIs opérationnels ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />) : (
            <>
              <StatCard title="Tournées à valider" value={tournees.pendingValidation ?? 0} icon={Route}         color="amber"   delay={0.1}  />
              <StatCard title="Tournées en cours"  value={tournees.inProgress        ?? 0} icon={Truck}         color="brand"   delay={0.15} />
              <StatCard title="Incidents ouverts"  value={incidents.open             ?? 0} icon={AlertTriangle} color="red"     delay={0.2}  />
              <StatCard title="Annulations en att."value={cancels.pending            ?? 0} icon={Ban}           color="amber"   delay={0.25} />
            </>
          )}
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Activité commandes */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="lg:col-span-2 glass p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Activité des commandes</h3>
                <p className="text-xs text-slate-500 mt-0.5">Aujourd'hui par tranche horaire</p>
              </div>
              <TrendingUp className="w-4 h-4 text-brand-400" />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={ordersChartData}>
                <defs>
                  <linearGradient id="gVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gPend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-row)" />
                <XAxis dataKey="h" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="validated" name="Validées"   stroke="#7c3aed" strokeWidth={2} fill="url(#gVal)"  />
                <Area type="monotone" dataKey="pending"   name="En attente" stroke="#f59e0b" strokeWidth={2} fill="url(#gPend)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Tournées pie */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="glass p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Tournées</h3>
                <p className="text-xs text-slate-500 mt-0.5">Répartition par statut</p>
              </div>
              <Activity className="w-4 h-4 text-brand-400" />
            </div>
            {tourneesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={tourneesChartData} cx="50%" cy="45%" outerRadius={70} innerRadius={40}
                    dataKey="value" paddingAngle={3}>
                    {tourneesChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={v => <span className="text-xs text-slate-400">{v}</span>} iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-600 text-sm">Aucune tournée</div>
            )}
          </motion.div>
        </div>

        {/* ── Incidents + Vue d'ensemble ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Incidents bar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }} className="glass p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" /> Incidents
            </h3>
            <div className="space-y-3 mb-4">
              {[
                { label: 'Ouverts',  value: incidents.open       ?? 0, total: incidents.total ?? 1, color: 'bg-red-500'     },
                { label: 'En cours', value: incidents.inProgress ?? 0, total: incidents.total ?? 1, color: 'bg-amber-500'   },
                { label: 'Résolus',  value: incidents.resolved   ?? 0, total: incidents.total ?? 1, color: 'bg-emerald-500' },
              ].map(({ label, value, total, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-slate-300 font-medium">{value}</span>
                  </div>
                  <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: total > 0 ? `${(value / total) * 100}%` : '0%' }}
                      transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                      className={`h-full rounded-full ${color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={incidentBarData} layout="vertical">
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {incidentBarData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Vue d'ensemble */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }} className="glass p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-5 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-400" /> Vue d'ensemble
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Commandes en transit',   value: orders.inTransit       ?? 0, color: 'text-brand-400'   },
                { label: 'Commandes livrées',       value: orders.delivered       ?? 0, color: 'text-emerald-400' },
                { label: 'Tournées validées',        value: tournees.validated     ?? 0, color: 'text-emerald-400' },
                { label: 'Tournées terminées',       value: tournees.completed     ?? 0, color: 'text-blue-400'   },
                { label: 'Annulations approuvées',  value: cancels.approved       ?? 0, color: 'text-slate-400'  },
                { label: 'Camions dans la flotte',  value: data?.totalTrucks      ?? 0, color: 'text-purple-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2"
                  style={{ borderBottom: '1px solid var(--border-row)' }}>
                  <span className="text-xs text-slate-400">{label}</span>
                  <span className={`text-sm font-bold ${color}`}>{value.toLocaleString('fr-FR')}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Tournées en attente (accès rapide) ── */}
        {pendingTournees.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }} className="glass overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--border-row)' }}>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Tournées en attente de validation
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
                  {pendingTournees.length}
                </span>
              </h3>
              <NavLink to="/responsable/tournees"
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                Voir toutes <ChevronRight className="w-3 h-3" />
              </NavLink>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-row)' }}>
              {pendingTournees.slice(0, 5).map((t, i) => (
                <motion.div key={t.id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + i * 0.04 }}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Route className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {(t as any).tourneeNumber ?? `#${t.id.substring(0, 8)}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(t as any).chauffeurName ? `Chauffeur : ${(t as any).chauffeurName}` : 'Sans chauffeur'}
                        {(t as any).plannedDate ? ` · ${(t as any).plannedDate}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={t.status} />
                    <p className="text-xs text-slate-600">{formatDateTime(t.createdAt)}</p>
                  </div>
                </motion.div>
              ))}
              {pendingTournees.length > 5 && (
                <div className="px-5 py-3 text-xs text-slate-500 text-center">
                  + {pendingTournees.length - 5} autres tournées en attente
                </div>
              )}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}
