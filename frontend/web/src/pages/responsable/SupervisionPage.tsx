import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Package, Route, AlertTriangle, Clock, CheckCircle2,
  XCircle, TrendingUp, Activity, Truck, Users, RefreshCw,
} from 'lucide-react'
import {
  getOrderStatsSupervision,
  getTourneeStatsSupervision,
  getRecentOrdersSupervision,
  getActiveTourneesSupervision,
  getIncidentsResponsable,
} from '@/api/responsable.api'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatDateTime } from '@/lib/utils'
import type { Order, Tournee, Incident } from '@/types'

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, colorClass, sub, delay = 0,
}: {
  label: string; value: number; icon: React.ElementType
  colorClass: string; sub?: string; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="glass p-4 flex items-center gap-4"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-100 leading-none">{value.toLocaleString('fr-FR')}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, title, count, colorClass }: {
  icon: React.ElementType; title: string; count?: number; colorClass: string
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${colorClass}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      {count != null && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/8">
          {count}
        </span>
      )}
    </div>
  )
}

// ── Order status color helper ─────────────────────────────────────────────────

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_VALIDATION: 'En attente',
  VALIDATED:          'Validée',
  REJECTED:           'Rejetée',
  IN_PLANNING:        'En planif.',
  PLANNED:            'Planifiée',
  IN_TRANSIT:         'En transit',
  DELIVERED:          'Livrée',
}

export default function SupervisionPage() {
  const REFETCH = 30_000

  const { data: orderStats = {}, isLoading: loadingOS } = useQuery({
    queryKey: ['supervision-order-stats'],
    queryFn: getOrderStatsSupervision,
    refetchInterval: REFETCH,
  })

  const { data: tourneeStats = {}, isLoading: loadingTS } = useQuery({
    queryKey: ['supervision-tournee-stats'],
    queryFn: getTourneeStatsSupervision,
    refetchInterval: REFETCH,
  })

  const { data: recentOrders = [], isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ['supervision-recent-orders'],
    queryFn: () => getRecentOrdersSupervision(15),
    refetchInterval: REFETCH,
  })

  const { data: activeTournees = [], isLoading: loadingTournees } = useQuery<Tournee[]>({
    queryKey: ['supervision-active-tournees'],
    queryFn: getActiveTourneesSupervision,
    refetchInterval: REFETCH,
  })

  const { data: openIncidents = [], isLoading: loadingInc } = useQuery<Incident[]>({
    queryKey: ['supervision-incidents'],
    queryFn: () => getIncidentsResponsable(),
    refetchInterval: REFETCH,
  })

  const isLoading = loadingOS || loadingTS

  const incOpen       = openIncidents.filter(i => i.status === 'OPEN').length
  const incInProgress = openIncidents.filter(i => i.status === 'IN_PROGRESS').length

  const SEVERITY_COLOR: Record<string, string> = {
    LOW:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    MEDIUM:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
    HIGH:     'text-orange-400 bg-orange-500/10 border-orange-500/20',
    CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
  }
  const SEVERITY_LABEL: Record<string, string> = {
    LOW: 'Faible', MEDIUM: 'Moyen', HIGH: 'Élevé', CRITICAL: 'Critique',
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Supervision opérationnelle"
        subtitle="Vue en temps réel de toutes les opérations"
      />

      <div className="flex-1 p-6 space-y-6">

        {/* ── Indicateurs commandes ─────────────────────────────── */}
        <section>
          <SectionTitle icon={Package} title="Commandes"
            count={orderStats['total'] ?? 0}
            colorClass="bg-blue-500/15 text-blue-400 border-blue-500/20" />
          {isLoading ? <PageLoader /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <KpiCard label="En attente validation" icon={Clock}
                value={orderStats['PENDING_VALIDATION'] ?? 0}
                colorClass="bg-amber-500/15 text-amber-400 border-amber-500/20"
                delay={0.04} />
              <KpiCard label="Validées" icon={CheckCircle2}
                value={orderStats['VALIDATED'] ?? 0}
                colorClass="bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                delay={0.07} />
              <KpiCard label="En planification" icon={Route}
                value={orderStats['IN_PLANNING'] ?? 0}
                colorClass="bg-brand-500/15 text-brand-400 border-brand-500/20"
                delay={0.10} />
              <KpiCard label="En transit" icon={TrendingUp}
                value={orderStats['IN_TRANSIT'] ?? 0}
                colorClass="bg-blue-500/15 text-blue-400 border-blue-500/20"
                delay={0.13} />
              <KpiCard label="Rejetées" icon={XCircle}
                value={orderStats['REJECTED'] ?? 0}
                colorClass="bg-red-500/15 text-red-400 border-red-500/20"
                delay={0.16} />
            </div>
          )}
        </section>

        {/* ── Indicateurs tournées ──────────────────────────────── */}
        <section>
          <SectionTitle icon={Route} title="Tournées"
            count={tourneeStats['total'] ?? 0}
            colorClass="bg-brand-500/15 text-brand-400 border-brand-500/20" />
          {isLoading ? null : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <KpiCard label="Brouillons" icon={Activity}
                value={tourneeStats['draft'] ?? 0}
                colorClass="bg-slate-500/15 text-slate-400 border-slate-500/20"
                delay={0.19} />
              <KpiCard label="En attente validation" icon={Clock}
                value={tourneeStats['pendingValidation'] ?? 0}
                colorClass="bg-amber-500/15 text-amber-400 border-amber-500/20"
                delay={0.22} />
              <KpiCard label="Validées" icon={CheckCircle2}
                value={tourneeStats['validated'] ?? 0}
                colorClass="bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                delay={0.25} />
              <KpiCard label="En cours de livraison" icon={Truck}
                value={tourneeStats['inProgress'] ?? 0}
                colorClass="bg-blue-500/15 text-blue-400 border-blue-500/20"
                delay={0.28} />
              <KpiCard label="Terminées" icon={CheckCircle2}
                value={tourneeStats['completed'] ?? 0}
                colorClass="bg-slate-500/15 text-slate-300 border-slate-500/20"
                delay={0.31} />
            </div>
          )}
        </section>

        {/* ── Indicateurs incidents ─────────────────────────────── */}
        <section>
          <SectionTitle icon={AlertTriangle} title="Incidents actifs"
            count={incOpen + incInProgress}
            colorClass="bg-red-500/15 text-red-400 border-red-500/20" />
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <KpiCard label="Ouverts" icon={AlertTriangle}
              value={incOpen}
              colorClass="bg-red-500/15 text-red-400 border-red-500/20"
              delay={0.34} />
            <KpiCard label="En cours traitement" icon={Users}
              value={incInProgress}
              colorClass="bg-amber-500/15 text-amber-400 border-amber-500/20"
              delay={0.36} />
          </div>
        </section>

        {/* ── Grille : commandes récentes + tournées actives ────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Commandes récentes */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }} className="glass overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-slate-200">Commandes récentes</span>
              </div>
              {loadingOrders && <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin" />}
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {recentOrders.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500 text-center">Aucune commande</p>
              ) : recentOrders.map((o, i) => (
                <motion.div key={o.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.02 }}
                  className="flex items-center justify-between px-5 py-3 hover:bg-white/2 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-brand-300 font-semibold">
                        {(o as any).orderNumber ?? `#${o.id.substring(0, 8)}`}
                      </span>
                      {(o as any).clientCode && (
                        <span className="text-xs text-slate-500">{(o as any).clientCode}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(o as any).requestedDeliveryDate?.split('T')[0] ?? '—'}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Tournées actives */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }} className="glass overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2">
                <Route className="w-4 h-4 text-brand-400" />
                <span className="text-sm font-semibold text-slate-200">Tournées</span>
              </div>
              {loadingTournees && <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin" />}
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {activeTournees.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500 text-center">Aucune tournée</p>
              ) : activeTournees.map((t, i) => (
                <motion.div key={t.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.42 + i * 0.02 }}
                  className="flex items-center justify-between px-5 py-3 hover:bg-white/2 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">
                        {t.tourneeNumber ?? `#${t.id.substring(0, 8)}`}
                      </span>
                      {t.truckPlate && (
                        <span className="text-xs font-mono text-brand-300">{t.truckPlate}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.plannedDate ?? '—'}
                      {t.chauffeurName ? ` · ${t.chauffeurName}` : ''}
                      {(t.stops ?? []).length > 0 ? ` · ${t.stops!.length} arrêt(s)` : ''}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Incidents nécessitant attention ───────────────────── */}
        {(incOpen > 0 || incInProgress > 0) && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }} className="glass overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-slate-200">
                Incidents nécessitant attention
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                {incOpen + incInProgress}
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {openIncidents
                .filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS')
                .slice(0, 5)
                .map((inc, i) => {
                  const sev = (inc as any).severity ?? 'MEDIUM'
                  return (
                    <motion.div key={inc.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: 0.47 + i * 0.02 }}
                      className="flex items-center justify-between px-5 py-3 hover:bg-white/2 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border flex-shrink-0 ${
                          SEVERITY_COLOR[sev] ?? SEVERITY_COLOR.MEDIUM
                        }`}>
                          {SEVERITY_LABEL[sev] ?? sev}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-300 truncate">{inc.description}</p>
                          <p className="text-xs text-slate-600">
                            {(inc as any).clientCode && `${(inc as any).clientCode} · `}
                            {formatDateTime(inc.createdAt)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={inc.status} />
                    </motion.div>
                  )
                })}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}
