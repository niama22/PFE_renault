import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, UserCheck, XCircle, Truck, Search, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { getIncidents, takeIncident, resolveIncident, closeIncident } from '@/api/operateur.api'
import UserInfoButton from '@/components/shared/UserInfoButton'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Pagination from '@/components/shared/Pagination'
import { formatDateTime } from '@/lib/utils'
import type { Incident } from '@/types'

const PAGE_SIZE = 4

function ResolveModal({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const qc = useQueryClient()
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: () => resolveIncident(incident.id, notes),
    onSuccess: () => {
      toast.success('Incident résolu')
      qc.invalidateQueries({ queryKey: ['operateur-incidents'] })
      onClose()
    },
    onError: () => toast.error('Erreur lors de la résolution'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass p-6 w-full max-w-md rounded-2xl shadow-2xl">
        <h2 className="text-slate-100 font-semibold text-base mb-1">Résoudre l'incident</h2>
        <p className="text-xs text-slate-500 mb-3">#{incident.id.substring(0, 8)} · {incident.description}</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Réponse / notes de résolution (obligatoire)..."
          rows={3}
          className="input-dark w-full resize-none mb-4"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
            Annuler
          </button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !notes.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50">
            {mutation.isPending ? 'Chargement...' : 'Résoudre'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  LOW:      { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Faible' },
  MEDIUM:   { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',       label: 'Moyen' },
  HIGH:     { color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',    label: 'Élevé' },
  CRITICAL: { color: 'text-red-400 bg-red-500/10 border-red-500/20',             label: 'Critique' },
}

export default function OperateurIncidentsPage() {
  const qc = useQueryClient()
  const [statusFilter,   setStatusFilter]   = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [dateFilter,     setDateFilter]     = useState('')
  const [searchFilter,   setSearchFilter]   = useState('')
  const [page, setPage] = useState(0)
  const [takeTarget, setTakeTarget]       = useState<Incident | null>(null)
  const [resolveTarget, setResolveTarget] = useState<Incident | null>(null)
  const [closeTarget, setCloseTarget]     = useState<Incident | null>(null)

  const { data: allIncidents = [], isLoading } = useQuery<Incident[]>({
    queryKey: ['operateur-incidents', statusFilter],
    queryFn: () => getIncidents(statusFilter || undefined),
    refetchInterval: 30_000,
  })

  const filteredIncidents = allIncidents.filter((inc: any) => {
    if (severityFilter && inc.severity !== severityFilter) return false
    if (dateFilter && inc.createdAt?.split('T')[0] !== dateFilter) return false
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      if (!`${inc.description ?? ''} ${inc.clientCode ?? ''} ${(inc as any).clientId ?? ''}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalPages = Math.ceil(filteredIncidents.length / PAGE_SIZE)
  const incidents = filteredIncidents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const takeMutation = useMutation({
    mutationFn: (id: string) => takeIncident(id),
    onSuccess: () => {
      toast.success('Incident pris en charge')
      qc.invalidateQueries({ queryKey: ['operateur-incidents'] })
      setTakeTarget(null)
    },
    onError: () => toast.error('Erreur'),
  })

  const closeMutation = useMutation({
    mutationFn: (id: string) => closeIncident(id),
    onSuccess: () => {
      toast.success('Incident fermé')
      qc.invalidateQueries({ queryKey: ['operateur-incidents'] })
      setCloseTarget(null)
    },
    onError: () => toast.error('Erreur'),
  })

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Incidents" subtitle="Suivi et résolution des incidents clients" />

      <div className="flex-1 p-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 flex-wrap">
          {/* Recherche texte */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
              value={searchFilter}
              onChange={e => { setSearchFilter(e.target.value); setPage(0) }}
              placeholder="Rechercher description / client..."
              className="input-dark pl-9 text-sm w-56"
            />
          </div>
          {/* Filtre statut */}
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
            className="input-dark text-sm">
            <option value="">Tous les statuts</option>
            <option value="OPEN">Ouverts</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="RESOLVED">Résolus</option>
            <option value="CLOSED">Fermés</option>
          </select>
          {/* Filtre sévérité */}
          <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setPage(0) }}
            className="input-dark text-sm">
            <option value="">Toutes les sévérités</option>
            <option value="LOW">Faible</option>
            <option value="MEDIUM">Moyen</option>
            <option value="HIGH">Élevé</option>
            <option value="CRITICAL">Critique</option>
          </select>
          {/* Filtre date */}
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setPage(0) }}
              className="input-dark pl-9 text-sm w-44"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          {isLoading && <span className="text-xs text-slate-500">Chargement...</span>}
        </motion.div>

        {isLoading ? <PageLoader /> : filteredIncidents.length === 0 ? (
          <EmptyState title="Aucun incident" description="Aucun incident ne correspond aux filtres." />
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
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-red-600/10 border border-red-500/20 flex-shrink-0 flex items-center justify-center mt-0.5">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${sev.color}`}>{sev.label}</span>
                            <StatusBadge status={inc.status} />
                            {/* Source: client ou chauffeur */}
                            {(inc as any).source === 'CHAUFFEUR' && (inc as any).chauffeurId ? (
                              <UserInfoButton
                                userId={(inc as any).chauffeurId}
                                label={(inc as any).chauffeurName ?? 'Chauffeur'}
                                variant="chauffeur"
                              />
                            ) : (inc as any).clientId && !(inc as any).clientId.startsWith('chauffeur:') ? (
                              <UserInfoButton
                                userId={(inc as any).clientId}
                                label={(inc as any).clientCode ?? 'Client'}
                                variant="client"
                              />
                            ) : (inc as any).clientCode ? (
                              <span className="text-xs font-mono text-brand-400 bg-brand-600/10 px-2 py-0.5 rounded-full border border-brand-500/20">
                                {(inc as any).clientCode}
                              </span>
                            ) : null}
                            <span className="text-xs text-slate-600">#{inc.id.substring(0, 8)}</span>
                          </div>
                          <p className="text-sm text-slate-200 font-medium mb-1 truncate">{inc.description}</p>
                          <p className="text-xs text-slate-500">{formatDateTime(inc.createdAt)}</p>
                          {(inc as any).operatorResponse && (
                            <p className="text-xs text-slate-400 mt-1 italic">
                              Réponse : {(inc as any).operatorResponse}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {inc.status === 'OPEN' && (
                          <button onClick={() => setTakeTarget(inc)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-brand-600/15 text-brand-400 hover:bg-brand-600/25 border border-brand-500/20 transition-colors">
                            <UserCheck className="w-3.5 h-3.5" />
                            Prendre en charge
                          </button>
                        )}
                        {inc.status === 'IN_PROGRESS' && (
                          <button onClick={() => setResolveTarget(inc)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 border border-emerald-500/20 transition-colors">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Résoudre
                          </button>
                        )}
                        {inc.status === 'RESOLVED' && (
                          <button onClick={() => setCloseTarget(inc)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-600/15 text-slate-400 hover:bg-slate-600/25 border border-slate-500/20 transition-colors">
                            <XCircle className="w-3.5 h-3.5" />
                            Fermer
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage}
              totalElements={filteredIncidents.length} pageSize={PAGE_SIZE} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!takeTarget}
        onOpenChange={v => !v && setTakeTarget(null)}
        title="Prendre en charge l'incident"
        description="Vous serez assigné comme responsable de cet incident."
        confirmLabel="Prendre en charge"
        onConfirm={() => takeTarget && takeMutation.mutate(takeTarget.id)}
        loading={takeMutation.isPending}
      />

      <ConfirmDialog
        open={!!closeTarget}
        onOpenChange={v => !v && setCloseTarget(null)}
        title="Fermer l'incident"
        description="Confirmer la clôture définitive de cet incident résolu ?"
        confirmLabel="Fermer"
        onConfirm={() => closeTarget && closeMutation.mutate(closeTarget.id)}
        loading={closeMutation.isPending}
      />

      {resolveTarget && <ResolveModal incident={resolveTarget} onClose={() => setResolveTarget(null)} />}
    </div>
  )
}
