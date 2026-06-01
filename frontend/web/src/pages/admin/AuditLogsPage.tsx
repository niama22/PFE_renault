import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Shield, Filter, LogIn, LogOut, UserPlus, Settings, Package, Route, AlertTriangle } from 'lucide-react'
import { getAuditLogs } from '@/api/admin.api'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import Pagination from '@/components/shared/Pagination'
import { formatDateTime } from '@/lib/utils'

const EVENT_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  USER_LOGIN:           { label: 'Connexion',          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: LogIn },
  USER_LOGOUT:          { label: 'Déconnexion',         color: 'bg-slate-500/15 text-slate-400 border-slate-500/20',     icon: LogOut },
  USER_CREATED:         { label: 'Compte créé',         color: 'bg-blue-500/15 text-blue-400 border-blue-500/20',        icon: UserPlus },
  USER_UPDATED:         { label: 'Compte modifié',      color: 'bg-amber-500/15 text-amber-400 border-amber-500/20',     icon: Settings },
  USER_DISABLED:        { label: 'Compte désactivé',    color: 'bg-red-500/15 text-red-400 border-red-500/20',           icon: Shield },
  USER_ENABLED:         { label: 'Compte activé',       color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: Shield },
  ORDER_CREATED:        { label: 'Commande créée',      color: 'bg-blue-500/15 text-blue-400 border-blue-500/20',        icon: Package },
  ORDER_VALIDATED:      { label: 'Commande validée',    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: Package },
  ORDER_REJECTED:       { label: 'Commande rejetée',    color: 'bg-red-500/15 text-red-400 border-red-500/20',           icon: Package },
  TOURNEE_CREATED:      { label: 'Tournée créée',       color: 'bg-brand-500/15 text-brand-400 border-brand-500/20',     icon: Route },
  TOURNEE_VALIDATED:    { label: 'Tournée validée',     color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: Route },
  INCIDENT_CREATED:     { label: 'Incident signalé',    color: 'bg-amber-500/15 text-amber-400 border-amber-500/20',     icon: AlertTriangle },
  INCIDENT_RESOLVED:    { label: 'Incident résolu',     color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: AlertTriangle },
}

const FILTER_OPTIONS = [
  { value: '',                label: 'Tous les événements' },
  { value: 'USER_LOGIN',      label: 'Connexions' },
  { value: 'USER_LOGOUT',     label: 'Déconnexions' },
  { value: 'USER_CREATED',    label: 'Comptes créés' },
  { value: 'USER_UPDATED',    label: 'Comptes modifiés' },
  { value: 'USER_DISABLED',   label: 'Comptes désactivés' },
  { value: 'ORDER_CREATED',   label: 'Commandes créées' },
  { value: 'ORDER_VALIDATED', label: 'Commandes validées' },
  { value: 'ORDER_REJECTED',  label: 'Commandes rejetées' },
  { value: 'TOURNEE_CREATED', label: 'Tournées créées' },
  { value: 'INCIDENT_CREATED', label: 'Incidents signalés' },
  { value: 'INCIDENT_RESOLVED', label: 'Incidents résolus' },
]

export default function AuditLogsPage() {
  const [page, setPage] = useState(0)
  const [filterType, setFilterType] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => getAuditLogs(page, 50),
    refetchInterval: 30_000,
  })

  const logs = data?.content ?? []
  const totalPages = data?.totalPages ?? 1

  const filtered = filterType ? logs.filter(l => l.eventType === filterType) : logs

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Journal d'audit" subtitle="Toutes les actions — connexions, comptes, commandes, tournées" />

      <div className="flex-1 p-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(0) }}
            className="input-dark text-sm">
            {FILTER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="text-xs text-slate-600 ml-auto">Actualisation auto 30s</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass overflow-hidden">
          {isLoading ? <PageLoader /> : filtered.length === 0 ? (
            <EmptyState title="Aucun log" description="Aucune activité enregistrée." />
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-subtle">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-44">Événement</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acteur</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rôle</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Détails</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => {
                    const cfg = EVENT_CONFIG[log.eventType]
                    const Icon = cfg?.icon ?? Shield
                    return (
                      <motion.tr key={log.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.015 }}
                        className="border-b border-subtle hover:bg-white/2 transition-colors">
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${cfg?.color ?? 'bg-slate-500/15 text-slate-400 border-slate-500/20'}`}>
                            <Icon className="w-3 h-3" />
                            {cfg?.label ?? log.eventType}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-xs font-mono text-slate-300">{log.actorId?.substring(0, 12)}…</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-navy-700 text-slate-400 border border-white/5">
                            {log.actorRole?.toLowerCase() ?? '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3 max-w-xs">
                          <p className="text-xs text-slate-500 truncate">{log.details ?? '—'}</p>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>

              <Pagination page={page} totalPages={totalPages} onPageChange={setPage}
                totalElements={data?.totalElements} pageSize={50} />
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
