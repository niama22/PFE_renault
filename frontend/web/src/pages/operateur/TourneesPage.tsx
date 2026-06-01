import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Truck, Send, CheckCircle2, XCircle,
  PlayCircle, RotateCcw, AlertCircle, Clock,
  ChevronDown, ChevronUp, Archive, Activity,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getTournees,
  confirmPlanningOperateur,
  runOptimizationOperateur,
  startDelivery,
} from '@/api/operateur.api'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Pagination from '@/components/shared/Pagination'
import { PlanningManifest, FillBar, recalcTournee } from '@/components/shared/PlanningManifest'
import { usePlanningStore } from '@/store/planning.store'
import type { Tournee, ProposedTournee, DeliveryStop } from '@/types'

// ── Helper: Tournee → ProposedTournee (for PlanningManifest) ─────────────────

function tourneeToProposed(t: Tournee): ProposedTournee {
  return {
    truckId: t.truckId ?? t.id,
    truckPlate: t.truckPlate ?? '—',
    truckLabel: t.truckLabel ?? '—',
    truckMaxWeightKg: 0,
    truckMaxVolumeM3: 0,
    plannedDate: t.plannedDate,
    stops: t.stops ?? [],
    totalWeightKg: (t.stops ?? []).reduce((s, st) => s + st.weightKg, 0),
    totalVolumeM3: (t.stops ?? []).reduce((s, st) => s + st.volumeM3, 0),
    fillRatePercent: t.fillRatePercent ?? 0,
    estimatedDistanceKm: t.estimatedDistanceKm ?? 0,
    totalOrders: (t.stops ?? []).length,
  }
}

// ── Collapsible manifest section ─────────────────────────────────────────────

function TourneeManifestSection({
  tournee,
  action,
  defaultExpanded = true,
}: {
  tournee: Tournee
  action?: React.ReactNode
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const stopCount = (tournee.stops ?? []).length
  const hasStops = stopCount > 0

  const borderColor = 'rgba(124,58,237,0.2)'
  const headerRadius = expanded && hasStops ? '0.75rem 0.75rem 0 0' : '0.75rem'

  return (
    <div>
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: 'rgba(124,58,237,0.08)',
          border: `1px solid ${borderColor}`,
          borderBottom: expanded && hasStops ? 'none' : undefined,
          borderRadius: headerRadius,
        }}
      >
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-brand-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-200 whitespace-nowrap">
              {tournee.tourneeNumber ?? `#${tournee.id.substring(0, 8)}`}
            </span>
          </div>
          <StatusBadge status={tournee.status} />
          {tournee.truckPlate && (
            <span className="text-xs text-slate-400 whitespace-nowrap">
              IT : <span className="font-mono text-brand-300">{tournee.truckPlate}</span>
            </span>
          )}
          {tournee.truckLabel && (
            <span className="text-xs text-slate-500">{tournee.truckLabel}</span>
          )}
          <span className="text-xs text-slate-500 whitespace-nowrap">{stopCount} arrêt(s)</span>
          {tournee.fillRatePercent != null && tournee.fillRatePercent > 0 && (
            <div className="w-24 flex-shrink-0">
              <FillBar value={tournee.fillRatePercent} />
            </div>
          )}
          {tournee.plannedDate && (
            <span className="text-xs text-slate-600 whitespace-nowrap">
              {new Date(tournee.plannedDate).toLocaleDateString('fr-FR')}
            </span>
          )}
          {tournee.rejectionReason && (
            <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
              Motif : {tournee.rejectionReason}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {action}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/10 transition-colors"
            title={expanded ? 'Réduire' : 'Développer'}
          >
            {expanded
              ? <ChevronUp className="w-4 h-4" />
              : <ChevronDown className="w-4 h-4" />
            }
          </button>
        </div>
      </div>

      {/* Manifest body */}
      {expanded && hasStops && (
        <div style={{
          border: `1px solid ${borderColor}`,
          borderTop: 'none',
          borderRadius: '0 0 0.75rem 0.75rem',
          overflow: 'hidden',
        }}>
          <PlanningManifest tournees={[tourneeToProposed(tournee)]} readOnly />
        </div>
      )}
      {expanded && !hasStops && (
        <div
          className="px-4 py-3 text-xs text-slate-600"
          style={{
            border: `1px solid ${borderColor}`,
            borderTop: 'none',
            borderRadius: '0 0 0.75rem 0.75rem',
          }}
        >
          Aucun arrêt enregistré.
        </div>
      )}
    </div>
  )
}

// ── Tab type ──────────────────────────────────────────────────────────────────

type Tab = 'proposed' | 'active' | 'history'

// ── Proposed tab (from planning store) ───────────────────────────────────────

function ProposedTab() {
  const qc = useQueryClient()
  const { proposed, confirmed, setProposed, setConfirmed, reset } = usePlanningStore()
  const [editableTournees, setEditableTournees] = useState<ProposedTournee[]>(proposed)

  function updateDate(truckId: string, date: string) {
    setEditableTournees(prev => {
      const updated = prev.map(t => t.truckId === truckId ? { ...t, plannedDate: date } : t)
      setProposed(updated)
      return updated
    })
  }

  function moveStop(stop: DeliveryStop, fromTruckId: string, toTruckId: string) {
    setEditableTournees(prev => {
      const from = prev.find(t => t.truckId === fromTruckId)!
      const to   = prev.find(t => t.truckId === toTruckId)!
      const updatedFrom = recalcTournee({ ...from, stops: from.stops.filter(s => s.orderId !== stop.orderId) })
      const updatedTo   = recalcTournee({ ...to,   stops: [...to.stops, stop] })
      const updated = prev.map(t => {
        if (t.truckId === fromTruckId) return updatedFrom
        if (t.truckId === toTruckId)   return updatedTo
        return t
      })
      setProposed(updated)
      return updated
    })
  }

  const confirmMutation = useMutation({
    mutationFn: (tournees: ProposedTournee[]) =>
      confirmPlanningOperateur(tournees.filter(t => t.stops.length > 0)),
    onSuccess: (data) => {
      setConfirmed(data ?? [])
      setEditableTournees([])
      qc.invalidateQueries({ queryKey: ['operateur-tournees'] })
      toast.success('Planning soumis au responsable')
    },
    onError: () => toast.error('Erreur lors de la soumission'),
  })

  const activeTournees = editableTournees.filter(t => t.stops.length > 0)

  // After confirming: show read-only manifest + sent banner
  if (confirmed && confirmed.length > 0 && editableTournees.length > 0) {
    return (
      <div className="space-y-4">
        <div className="glass p-4 flex items-center gap-3 border border-emerald-500/20">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex-shrink-0 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200">{confirmed.length} tournée(s) soumises au responsable</p>
            <p className="text-xs text-slate-500 mt-0.5">
              En attente de validation. Consultez l'onglet <span className="text-brand-400">Actives</span>.
            </p>
          </div>
          <button onClick={() => { reset(); setEditableTournees([]) }}
            className="flex-shrink-0 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Nouveau planning
          </button>
        </div>
        <PlanningManifest tournees={editableTournees} readOnly />
      </div>
    )
  }

  if (editableTournees.length > 0) {
    return (
      <div className="space-y-4">
        <div className="glass p-3 flex items-center gap-3 border border-amber-500/20">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-slate-400">
            Planning proposé — <span className="text-amber-400">{editableTournees.length} IT</span>,{' '}
            {editableTournees.reduce((s, t) => s + t.stops.length, 0)} arrêts.
            Modifiez les dates ou déplacez des arrêts avant de soumettre.
          </p>
          <button onClick={() => { reset(); setEditableTournees([]) }}
            className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Réinitialiser
          </button>
        </div>

        <PlanningManifest tournees={editableTournees} onDateChange={updateDate} onMove={moveStop} />

        <div className="flex items-center justify-between px-5 py-4 rounded-xl border border-emerald-500/20"
          style={{ background: 'rgba(16,185,129,0.05)' }}>
          <div>
            <p className="text-sm font-semibold text-slate-200">Confirmer et envoyer au responsable ?</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTournees.length} IT · {activeTournees.reduce((s, t) => s + t.stops.length, 0)} arrêts
            </p>
          </div>
          <button
            onClick={() => confirmMutation.mutate(editableTournees)}
            disabled={confirmMutation.isPending || activeTournees.length === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50">
            <Send className="w-4 h-4" />
            {confirmMutation.isPending ? 'Envoi...' : 'Confirmer & Soumettre'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <EmptyState
      title="Aucun planning proposé"
      description="Lancez l'optimisation depuis la page Planification pour générer un manifeste de livraison."
    />
  )
}

// ── Active tab (all non-completed tournées) ───────────────────────────────────

function ActiveTab({ onReoptimized }: { onReoptimized: () => void }) {
  const qc = useQueryClient()
  const { setProposed } = usePlanningStore()
  const [startTarget, setStartTarget] = useState<Tournee | null>(null)
  const [reoptimizingId, setReoptimizingId] = useState<string | null>(null)

  const { data: pending    = [], isLoading: l1 } = useQuery<Tournee[]>({
    queryKey: ['operateur-tournees', 'PENDING_RESPONSABLE_VALIDATION'],
    queryFn: () => getTournees('PENDING_RESPONSABLE_VALIDATION'),
  })
  const { data: drafts     = [], isLoading: l2 } = useQuery<Tournee[]>({
    queryKey: ['operateur-tournees', 'DRAFT'],
    queryFn: () => getTournees('DRAFT'),
  })
  const { data: validated  = [], isLoading: l3 } = useQuery<Tournee[]>({
    queryKey: ['operateur-tournees', 'VALIDATED'],
    queryFn: () => getTournees('VALIDATED'),
  })
  const { data: inProgress = [], isLoading: l4 } = useQuery<Tournee[]>({
    queryKey: ['operateur-tournees', 'IN_PROGRESS'],
    queryFn: () => getTournees('IN_PROGRESS'),
  })

  const reoptimizeMutation = useMutation({
    mutationFn: async (tournee: Tournee) => {
      const orderIds: string[] = tournee.orderIdsJson
        ? JSON.parse(tournee.orderIdsJson)
        : (tournee.orderIds ?? [])
      return runOptimizationOperateur({ orderIds })
    },
    onSuccess: (data) => {
      if (!data) return
      const withDates = data.proposedTournees.map(t => ({
        ...t,
        plannedDate: t.plannedDate ?? new Date(Date.now() + 86400000).toISOString().split('T')[0],
      }))
      setProposed(withDates)
      toast.success('Nouveau planning généré — consultez l\'onglet "Proposé"')
      onReoptimized()
    },
    onError: () => toast.error('Erreur lors du recalcul'),
    onSettled: () => setReoptimizingId(null),
  })

  const startMutation = useMutation({
    mutationFn: (id: string) => startDelivery(id),
    onSuccess: () => {
      toast.success('Livraison démarrée')
      qc.invalidateQueries({ queryKey: ['operateur-tournees'] })
      setStartTarget(null)
    },
    onError: () => toast.error('Erreur'),
  })

  const [activePage, setActivePage] = useState(0)
  const ACTIVE_PAGE_SIZE = 3

  if (l1 || l2 || l3 || l4) return <PageLoader />

  // Sort: pending first, then rejected drafts, then validated, then in-progress
  const sortedPending    = pending.map(t => ({ ...t, _group: 'pending' as const }))
  const rejected         = drafts.filter(t => !!t.rejectionReason).map(t => ({ ...t, _group: 'rejected' as const }))
  const plainDraft       = drafts.filter(t => !t.rejectionReason).map(t => ({ ...t, _group: 'draft' as const }))
  const sortedValidated  = validated.map(t => ({ ...t, _group: 'validated' as const }))
  const sortedInProgress = inProgress.map(t => ({ ...t, _group: 'inProgress' as const }))

  const all = [...sortedPending, ...rejected, ...plainDraft, ...sortedValidated, ...sortedInProgress]
  const totalActivePages = Math.ceil(all.length / ACTIVE_PAGE_SIZE)
  const pagedAll = all.slice(activePage * ACTIVE_PAGE_SIZE, (activePage + 1) * ACTIVE_PAGE_SIZE)

  // Rebuild groups from paged slice
  const pgPending    = pagedAll.filter(t => t._group === 'pending')
  const pgRejected   = pagedAll.filter(t => t._group === 'rejected')
  const pgDraft      = pagedAll.filter(t => t._group === 'draft')
  const pgValidated  = pagedAll.filter(t => t._group === 'validated')
  const pgInProgress = pagedAll.filter(t => t._group === 'inProgress')

  if (all.length === 0) return (
    <EmptyState
      title="Aucune tournée active"
      description="Les tournées confirmées et validées apparaîtront ici. Lancez une optimisation pour créer un planning."
    />
  )

  function getAction(t: typeof all[number]) {
    if (t._group === 'pending') {
      return (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg whitespace-nowrap">
          <Clock className="w-3.5 h-3.5" />
          Attente responsable
        </div>
      )
    }
    if (t._group === 'rejected') {
      return (
        <button
          onClick={() => { setReoptimizingId(t.id); reoptimizeMutation.mutate(t) }}
          disabled={reoptimizeMutation.isPending && reoptimizingId === t.id}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-brand-600/15 text-brand-400 hover:bg-brand-600/25 border border-brand-500/20 transition-colors disabled:opacity-50 whitespace-nowrap">
          <RotateCcw className={`w-3.5 h-3.5 ${reoptimizeMutation.isPending && reoptimizingId === t.id ? 'animate-spin' : ''}`} />
          {reoptimizeMutation.isPending && reoptimizingId === t.id ? 'Recalcul...' : 'Recalculer'}
        </button>
      )
    }
    if (t._group === 'validated') {
      return (
        <button
          onClick={() => setStartTarget(t)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 border border-emerald-500/20 transition-colors whitespace-nowrap">
          <PlayCircle className="w-3.5 h-3.5" />
          Démarrer livraison
        </button>
      )
    }
    if (t._group === 'inProgress') {
      return (
        <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg whitespace-nowrap">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          En cours
        </div>
      )
    }
    return null
  }

  return (
    <>
      {/* Group labels — rebuilt from current page slice */}
      {pgPending.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider px-1 mb-3">
            En attente de validation — {sortedPending.length} tournée(s)
          </p>
          <div className="space-y-4">
            {pgPending.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <TourneeManifestSection tournee={t} action={getAction(t)} defaultExpanded />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {pgRejected.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-red-400/80 uppercase tracking-wider px-1 mb-3 mt-5">
            Rejetées — à recalculer — {rejected.length} tournée(s)
          </p>
          <div className="space-y-4">
            {pgRejected.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <TourneeManifestSection tournee={t} action={getAction(t)} defaultExpanded />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {pgDraft.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 mb-3 mt-5">
            Brouillons — {plainDraft.length} tournée(s)
          </p>
          <div className="space-y-4">
            {pgDraft.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <TourneeManifestSection tournee={t} action={getAction(t)} defaultExpanded={false} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {pgValidated.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-emerald-400/80 uppercase tracking-wider px-1 mb-3 mt-5">
            Validées — prêtes à livrer — {sortedValidated.length} tournée(s)
          </p>
          <div className="space-y-4">
            {pgValidated.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <TourneeManifestSection tournee={t} action={getAction(t)} defaultExpanded={false} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {pgInProgress.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-blue-400/80 uppercase tracking-wider px-1 mb-3 mt-5">
            En cours de livraison — {sortedInProgress.length} tournée(s)
          </p>
          <div className="space-y-4">
            {pgInProgress.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <TourneeManifestSection tournee={t} action={getAction(t)} defaultExpanded={false} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <Pagination page={activePage} totalPages={totalActivePages} onPageChange={setActivePage}
        totalElements={all.length} pageSize={ACTIVE_PAGE_SIZE} />

      <ConfirmDialog
        open={!!startTarget}
        onOpenChange={v => !v && setStartTarget(null)}
        title="Démarrer la livraison"
        description={`Marquer la tournée ${startTarget?.tourneeNumber ?? ''} comme EN COURS ?`}
        confirmLabel="Démarrer"
        onConfirm={() => startTarget && startMutation.mutate(startTarget.id)}
        loading={startMutation.isPending}
      />
    </>
  )
}

// ── History tab (completed tournées) ─────────────────────────────────────────

function HistoryTab() {
  const [histPage, setHistPage] = useState(0)
  const HIST_PAGE_SIZE = 3

  const { data: completed = [], isLoading } = useQuery<Tournee[]>({
    queryKey: ['operateur-tournees', 'COMPLETED'],
    queryFn: () => getTournees('COMPLETED'),
  })

  if (isLoading) return <PageLoader />

  if (completed.length === 0) return (
    <EmptyState
      title="Aucun historique"
      description="Les tournées terminées (livrées) apparaîtront ici une fois complétées."
    />
  )

  const totalHistPages = Math.ceil(completed.length / HIST_PAGE_SIZE)
  const pagedCompleted = completed.slice(histPage * HIST_PAGE_SIZE, (histPage + 1) * HIST_PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* History header */}
      <div className="glass px-4 py-3 flex items-center gap-3 rounded-xl"
        style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <Archive className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-slate-200">{completed.length} tournée(s) terminée(s)</p>
          <p className="text-xs text-slate-500">Archivées après livraison complète. Cliquez sur une tournée pour voir ses détails.</p>
        </div>
      </div>

      {pagedCompleted.map((t, i) => (
        <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
          <TourneeManifestSection
            tournee={t}
            defaultExpanded={false}
            action={
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Terminée
              </div>
            }
          />
        </motion.div>
      ))}

      <Pagination page={histPage} totalPages={totalHistPages} onPageChange={setHistPage}
        totalElements={completed.length} pageSize={HIST_PAGE_SIZE} />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'proposed', label: 'Proposé',    icon: Truck },
  { key: 'active',   label: 'Actives',    icon: Activity },
  { key: 'history',  label: 'Historique', icon: Archive },
]

export default function OperateurTourneesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('proposed')
  const { proposed, confirmed } = usePlanningStore()

  // Pre-fetch counts for badges
  const { data: pendingList = [] } = useQuery<Tournee[]>({
    queryKey: ['operateur-tournees', 'PENDING_RESPONSABLE_VALIDATION'],
    queryFn: () => getTournees('PENDING_RESPONSABLE_VALIDATION'),
  })
  const { data: draftList = [] } = useQuery<Tournee[]>({
    queryKey: ['operateur-tournees', 'DRAFT'],
    queryFn: () => getTournees('DRAFT'),
  })
  const { data: validatedList = [] } = useQuery<Tournee[]>({
    queryKey: ['operateur-tournees', 'VALIDATED'],
    queryFn: () => getTournees('VALIDATED'),
  })
  const { data: inProgressList = [] } = useQuery<Tournee[]>({
    queryKey: ['operateur-tournees', 'IN_PROGRESS'],
    queryFn: () => getTournees('IN_PROGRESS'),
  })

  const proposedBadge = proposed.length > 0 || (confirmed?.length ?? 0) > 0
    ? (proposed.length || confirmed?.length) : null

  const activeCount = pendingList.length + draftList.length + validatedList.length + inProgressList.length
  const activeBadge = activeCount > 0 ? activeCount : null

  // Highlight color for badge by tab
  const badgeClass = (key: Tab) => {
    if (key === 'active' && pendingList.length > 0) return 'bg-amber-500/20 text-amber-400'
    if (key === 'active') return 'bg-brand-500/20 text-brand-400'
    return 'bg-brand-500/20 text-brand-400'
  }

  const badges: Record<Tab, number | null> = {
    proposed: proposedBadge ?? null,
    active:   activeBadge,
    history:  null,
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Tournées" subtitle="Manifeste de livraison et suivi des tournées" />

      <div className="flex-1 p-6 space-y-5">

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="glass p-1 flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
                activeTab === tab.key
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {badges[tab.key] != null && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badgeClass(tab.key)}`}>
                  {badges[tab.key]}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <div>
          {activeTab === 'proposed' && <ProposedTab />}
          {activeTab === 'active'   && <ActiveTab onReoptimized={() => setActiveTab('proposed')} />}
          {activeTab === 'history'  && <HistoryTab />}
        </div>

      </div>
    </div>
  )
}
