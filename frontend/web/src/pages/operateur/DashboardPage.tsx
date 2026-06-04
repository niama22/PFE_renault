import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Package, Route, AlertTriangle, Ban,
  Clock, CheckCircle2, Truck, TrendingUp,
} from 'lucide-react'
import { getOrderStats, getTourneeStats, getRecentOrders, getIncidents, getCancellations } from '@/api/operateur.api'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/shared/StatusBadge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatDateTime } from '@/lib/utils'

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: number | string
  sub?: string; color: string
}) {
  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      className="glass p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white leading-tight">{value}</p>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        {sub && <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  )
}

export default function OperateurDashboardPage() {
  const { data: orderStats  = {}, isLoading: l1 } = useQuery({ queryKey:['oper-order-stats'],   queryFn: getOrderStats,   refetchInterval: 30_000 })
  const { data: tourneeStats = {}, isLoading: l2 } = useQuery({ queryKey:['oper-tournee-stats'], queryFn: getTourneeStats, refetchInterval: 30_000 })
  const { data: recent      = [], isLoading: l3 } = useQuery({ queryKey:['oper-recent-orders'], queryFn: getRecentOrders, refetchInterval: 30_000 })
  const { data: incidents   = [], isLoading: l4 } = useQuery({ queryKey:['oper-incidents-all'], queryFn: () => getIncidents(), refetchInterval: 30_000 })
  const { data: cancels     = [], isLoading: l5 } = useQuery({ queryKey:['oper-cancels-all'],   queryFn: getCancellations, refetchInterval: 30_000 })

  const openIncidents    = (incidents as any[]).filter(i => i.status === 'OPEN').length
  const pendingCancels   = (cancels as any[]).filter(c => c.status === 'PENDING_OPERATEUR').length

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Dashboard Opérateur" subtitle="Vue d'ensemble des opérations" />

      <div className="flex-1 p-6 space-y-6">

        {(l1||l2) ? <PageLoader /> : (
          <>
            {/* Commandes */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                <Package className="w-3.5 h-3.5" /> Commandes
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={<Clock className="w-5 h-5 text-amber-400" />}
                  label="En attente validation" color="bg-amber-500/10 border border-amber-500/20"
                  value={orderStats.PENDING_VALIDATION ?? 0} />
                <StatCard icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  label="Validées" color="bg-emerald-500/10 border border-emerald-500/20"
                  value={orderStats.VALIDATED ?? 0} />
                <StatCard icon={<Truck className="w-5 h-5 text-blue-400" />}
                  label="En transit" color="bg-blue-500/10 border border-blue-500/20"
                  value={orderStats.IN_TRANSIT ?? 0} />
                <StatCard icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
                  label="Total commandes" color="bg-purple-500/10 border border-purple-500/20"
                  value={orderStats.total ?? 0}
                  sub={`Livrées: ${orderStats.DELIVERED ?? 0}`} />
              </div>
            </div>

            {/* Tournées */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                <Route className="w-3.5 h-3.5" /> Tournées
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={<Clock className="w-5 h-5 text-amber-400" />}
                  label="En attente respo" color="bg-amber-500/10 border border-amber-500/20"
                  value={tourneeStats.pendingValidation ?? 0} />
                <StatCard icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  label="Validées" color="bg-emerald-500/10 border border-emerald-500/20"
                  value={tourneeStats.validated ?? 0} />
                <StatCard icon={<Truck className="w-5 h-5 text-blue-400" />}
                  label="En cours" color="bg-blue-500/10 border border-blue-500/20"
                  value={tourneeStats.inProgress ?? 0} />
                <StatCard icon={<CheckCircle2 className="w-5 h-5 text-slate-400" />}
                  label="Complétées" color="bg-slate-500/10 border border-slate-500/20"
                  value={tourneeStats.completed ?? 0} />
              </div>
            </div>

            {/* Incidents & Annulations */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
                label="Incidents ouverts" color="bg-red-500/10 border border-red-500/20"
                value={l4 ? '…' : openIncidents}
                sub={`Total: ${(incidents as any[]).length}`} />
              <StatCard icon={<Ban className="w-5 h-5 text-orange-400" />}
                label="Annulations à transmettre" color="bg-orange-500/10 border border-orange-500/20"
                value={l5 ? '…' : pendingCancels}
                sub={`Total: ${(cancels as any[]).length}`} />
            </div>

            {/* Dernières commandes */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                <Package className="w-3.5 h-3.5" /> Dernières commandes
              </p>
              {l3 ? <PageLoader /> : (
                <div className="glass rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                        {['Numéro','Client','Destination','Date livraison','Statut'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(recent as any[]).map((o: any, i: number) => {
                        const addr = typeof o.deliveryAddress === 'object'
                          ? `${o.deliveryAddress?.city ?? ''}` : o.deliveryAddress ?? '—'
                        return (
                          <tr key={o.id}
                            className="transition-colors hover:bg-white/5"
                            style={{ borderBottom: i < recent.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            <td className="px-4 py-3 font-mono text-brand-400 text-xs">{o.orderNumber ?? `#${o.id?.slice(0,8)}`}</td>
                            <td className="px-4 py-3 text-slate-300 text-xs">{o.clientCode ?? '—'}</td>
                            <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[160px]">{addr}</td>
                            <td className="px-4 py-3 text-slate-400 text-xs">{o.requestedDeliveryDate?.split('T')[0] ?? '—'}</td>
                            <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                          </tr>
                        )
                      })}
                      {recent.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-600 text-sm">Aucune commande</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
