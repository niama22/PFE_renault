import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Package, AlertTriangle, Route, Users,
  TrendingUp, Clock, CheckCircle2, XCircle,
  Truck, Activity, RefreshCw,
} from 'lucide-react'
import { getDashboard } from '@/api/admin.api'
import StatCard from '@/components/shared/StatCard'
import Header from '@/components/layout/Header'
import { formatDateTime } from '@/lib/utils'

const BRAND_COLORS = ['#7c3aed', '#a855f7', '#c084fc', '#e879f9', '#f0abfc']
const PIE_COLORS   = { brand: '#7c3aed', blue: '#3b82f6', emerald: '#10b981', amber: '#f59e0b', red: '#ef4444' }

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

export default function DashboardPage() {
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 30_000,
  })

  // Distribue les totaux réels sur les tranches horaires
  const total    = data?.orders.total ?? 0
  const validated = data?.orders.validated ?? 0
  const pending   = data?.orders.pending   ?? 0
  const rejected  = data?.orders.rejected  ?? 0
  const weights = [0.05, 0.05, 0.10, 0.20, 0.25, 0.20, 0.15]
  const hours   = ['00h','04h','08h','12h','14h','16h','20h']
  const ordersChartData = hours.map((h, i) => ({
    h,
    validated: Math.round(validated * weights[i]),
    pending:   Math.round(pending   * weights[i]),
    rejected:  Math.round(rejected  * weights[i]),
  }))

  const tourneesChartData = [
    { name: 'En attente', value: data?.tournees.pendingValidation ?? 0, color: PIE_COLORS.amber },
    { name: 'Validées',   value: data?.tournees.validated ?? 0,         color: PIE_COLORS.emerald },
    { name: 'En cours',   value: data?.tournees.inProgress ?? 0,        color: PIE_COLORS.brand },
    { name: 'Terminées',  value: data?.tournees.completed ?? 0,         color: PIE_COLORS.blue },
  ].filter(d => d.value > 0)

  const incidentsPieData = [
    { name: 'Ouverts',    value: data?.incidents.open ?? 0,       color: PIE_COLORS.red },
    { name: 'En cours',   value: data?.incidents.inProgress ?? 0, color: PIE_COLORS.amber },
    { name: 'Résolus',    value: data?.incidents.resolved ?? 0,   color: PIE_COLORS.emerald },
  ].filter(d => d.value > 0)

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Dashboard"
        subtitle={dataUpdatedAt ? `Mis à jour ${formatDateTime(new Date(dataUpdatedAt))}` : undefined}
      />

      <div className="flex-1 p-6 space-y-6">

        {/* Refresh + Status bar */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-slate-500">Mise à jour automatique toutes les 30s</span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-brand-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-brand-600/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </motion.div>

        {/* ── Section Commandes ─── */}
        <section>
          <motion.h2
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"
          >
            <Package className="w-3.5 h-3.5 text-brand-500" />
            Commandes
          </motion.h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              <>
                <StatCard title="Total" value={data?.orders.total ?? 0}
                  icon={Package} color="brand" delay={0.05} />
                <StatCard title="En attente" value={data?.orders.pending ?? 0}
                  icon={Clock} color="amber" delay={0.1} />
                <StatCard title="Validées" value={data?.orders.validated ?? 0}
                  icon={CheckCircle2} color="emerald" delay={0.15} />
                <StatCard title="Rejetées" value={data?.orders.rejected ?? 0}
                  icon={XCircle} color="red" delay={0.2} />
              </>
            )}
          </div>
        </section>

        {/* ── Section Livraisons + Incidents + Users ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard title="Planifiées" value={data?.orders.planned ?? 0}
                icon={Route} color="blue" delay={0.1} />
              <StatCard title="En transit" value={data?.orders.inTransit ?? 0}
                icon={Truck} color="brand" delay={0.15} />
              <StatCard title="Incidents ouverts" value={data?.incidents.open ?? 0}
                icon={AlertTriangle} color="red" delay={0.2} />
              <StatCard title="Utilisateurs" value={data?.totalUsers ?? 0}
                icon={Users} color="emerald" delay={0.25} />
            </>
          )}
        </div>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Orders area chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="lg:col-span-2 glass p-5"
          >
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
                  <linearGradient id="gValidated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-row)" />
                <XAxis dataKey="h" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="validated" name="Validées" stroke="#7c3aed" strokeWidth={2} fill="url(#gValidated)" />
                <Area type="monotone" dataKey="pending"   name="En attente" stroke="#f59e0b" strokeWidth={2} fill="url(#gPending)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Tournées pie */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="glass p-5"
          >
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
                    {tourneesChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(v) => <span className="text-xs text-slate-400">{v}</span>}
                    iconType="circle" iconSize={8}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-600 text-sm">
                Aucune tournée
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Incidents + Bar chart ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Incidents status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="glass p-5"
          >
            <h3 className="text-sm font-semibold text-slate-200 mb-5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Incidents
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Ouverts',    value: data?.incidents.open ?? 0,       total: data?.incidents.total ?? 1, color: 'bg-red-500' },
                { label: 'En cours',   value: data?.incidents.inProgress ?? 0, total: data?.incidents.total ?? 1, color: 'bg-amber-500' },
                { label: 'Résolus',    value: data?.incidents.resolved ?? 0,   total: data?.incidents.total ?? 1, color: 'bg-emerald-500' },
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

            {/* Incidents pie */}
            {incidentsPieData.length > 0 && (
              <ResponsiveContainer width="100%" height={120} className="mt-4">
                <BarChart data={incidentsPieData} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {incidentsPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Quick stats summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            className="glass p-5"
          >
            <h3 className="text-sm font-semibold text-slate-200 mb-5 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-400" />
              Vue d'ensemble
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Commandes livrées',     value: data?.orders.delivered ?? 0,           color: 'text-emerald-400' },
                { label: 'Tournées en cours',      value: data?.tournees.inProgress ?? 0,        color: 'text-brand-400' },
                { label: 'Tournées terminées',     value: data?.tournees.completed ?? 0,          color: 'text-blue-400' },
                { label: 'Tournées à valider',     value: data?.tournees.pendingValidation ?? 0,  color: 'text-amber-400' },
                { label: 'Incidents total',        value: data?.incidents.total ?? 0,             color: 'text-slate-400' },
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

      </div>
    </div>
  )
}
