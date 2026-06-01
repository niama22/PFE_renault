import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { getIncidentsResponsable } from '@/api/responsable.api'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import Pagination from '@/components/shared/Pagination'
import { formatDateTime } from '@/lib/utils'
import type { Incident } from '@/types'

const PAGE_SIZE = 8

const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  LOW:      { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Faible' },
  MEDIUM:   { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',       label: 'Moyen' },
  HIGH:     { color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',    label: 'Élevé' },
  CRITICAL: { color: 'text-red-400 bg-red-500/10 border-red-500/20',             label: 'Critique' },
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string
}) {
  return (
    <div className="glass p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

export default function ResponsableIncidentsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)

  const { data: allIncidents = [], isLoading } = useQuery<Incident[]>({
    queryKey: ['responsable-incidents', statusFilter],
    queryFn: () => getIncidentsResponsable(statusFilter || undefined),
    refetchInterval: 30_000,
  })

  const { data: allForStats = [] } = useQuery<Incident[]>({
    queryKey: ['responsable-incidents-stats'],
    queryFn: () => getIncidentsResponsable(),
    refetchInterval: 60_000,
  })

  const stats = {
    open:       allForStats.filter(i => i.status === 'OPEN').length,
    inProgress: allForStats.filter(i => i.status === 'IN_PROGRESS').length,
    resolved:   allForStats.filter(i => i.status === 'RESOLVED').length,
    closed:     allForStats.filter(i => i.status === 'CLOSED').length,
  }

  const totalPages = Math.ceil(allIncidents.length / PAGE_SIZE)
  const incidents = allIncidents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Suivi des incidents" subtitle="Vue d'ensemble — lecture seule" />

      <div className="flex-1 p-6 space-y-5">
        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Ouverts" value={stats.open}
            icon={AlertTriangle} color="bg-red-600/15 text-red-400 border border-red-500/20" />
          <StatCard label="En cours" value={stats.inProgress}
            icon={Clock} color="bg-amber-600/15 text-amber-400 border border-amber-500/20" />
          <StatCard label="Résolus" value={stats.resolved}
            icon={CheckCircle2} color="bg-emerald-600/15 text-emerald-400 border border-emerald-500/20" />
          <StatCard label="Fermés" value={stats.closed}
            icon={XCircle} color="bg-slate-600/15 text-slate-400 border border-slate-500/20" />
        </motion.div>

        {/* Filtre */}
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
            className="input-dark text-sm">
            <option value="">Tous les statuts</option>
            <option value="OPEN">Ouverts</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="RESOLVED">Résolus</option>
            <option value="CLOSED">Fermés</option>
          </select>
        </motion.div>

        {/* Liste */}
        {isLoading ? <PageLoader /> : allIncidents.length === 0 ? (
          <EmptyState title="Aucun incident" description="Aucun incident pour ce filtre." />
        ) : (
          <>
            <div className="space-y-3">
              {incidents.map((inc, i) => {
                const sev = SEVERITY_CONFIG[inc.severity ?? 'MEDIUM'] ?? SEVERITY_CONFIG.MEDIUM
                return (
                  <motion.div key={inc.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-red-600/10 border border-red-500/20 flex-shrink-0 flex items-center justify-center mt-0.5">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${sev.color}`}>
                            {sev.label}
                          </span>
                          <StatusBadge status={inc.status} />
                          {(inc as any).clientCode && (
                            <span className="text-xs font-mono text-brand-400 bg-brand-600/10 px-2 py-0.5 rounded-full border border-brand-500/20">
                              {(inc as any).clientCode}
                            </span>
                          )}
                          <span className="text-xs text-slate-600 ml-auto">#{inc.id.substring(0, 8)}</span>
                        </div>
                        <p className="text-sm text-slate-200 font-medium mb-1">{inc.description}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(inc.createdAt)}</p>
                        {(inc as any).operatorResponse && (
                          <div className="mt-2 p-2.5 rounded-lg bg-emerald-600/10 border border-emerald-500/15">
                            <p className="text-xs text-emerald-400 font-medium mb-0.5">Réponse opérateur</p>
                            <p className="text-xs text-slate-400">{(inc as any).operatorResponse}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage}
              totalElements={allIncidents.length} pageSize={PAGE_SIZE} />
          </>
        )}
      </div>
    </div>
  )
}
