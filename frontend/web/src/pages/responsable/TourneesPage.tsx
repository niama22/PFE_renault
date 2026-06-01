import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Truck, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  getTourneesResponsable,
  validateTournee,
  rejectTournee,
} from '@/api/responsable.api'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Pagination from '@/components/shared/Pagination'
import { PlanningManifest, FillBar } from '@/components/shared/PlanningManifest'
import type { Tournee, ProposedTournee } from '@/types'

// ── Helper ────────────────────────────────────────────────────────────────────

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

// ── Reject modal ──────────────────────────────────────────────────────────────

function RejectModal({ tournee, onClose }: { tournee: Tournee; onClose: () => void }) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')

  const mutation = useMutation({
    mutationFn: () => rejectTournee(tournee.id, reason),
    onSuccess: () => {
      toast.success('Tournée rejetée')
      qc.invalidateQueries({ queryKey: ['responsable-tournees'] })
      qc.invalidateQueries({ queryKey: ['responsable-stats'] })
      onClose()
    },
    onError: () => toast.error('Erreur lors du rejet'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass p-6 w-full max-w-md rounded-2xl shadow-2xl">
        <h2 className="text-slate-100 font-semibold text-base mb-1">Rejeter la tournée</h2>
        <p className="text-xs text-slate-500 mb-4">{tournee.tourneeNumber ?? `#${tournee.id.substring(0, 8)}`}</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Motif du rejet (obligatoire)..."
          rows={3}
          className="input-dark w-full resize-none mb-4"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !reason.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50">
            {mutation.isPending ? 'Chargement...' : 'Rejeter'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Tournée card with inline manifest ─────────────────────────────────────────

function TourneeCard({
  tournee,
  onValidate,
  onReject,
  defaultExpanded = false,
}: {
  tournee: Tournee
  onValidate?: () => void
  onReject?: () => void
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const hasStops = (tournee.stops ?? []).length > 0

  return (
    <div className="glass overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 gap-4">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <div className="w-9 h-9 rounded-lg bg-brand-600/15 border border-brand-500/25 flex-shrink-0 flex items-center justify-center">
            <Truck className="w-4 h-4 text-brand-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-200">
                {tournee.tourneeNumber ?? `#${tournee.id.substring(0, 8)}`}
              </span>
              <StatusBadge status={tournee.status} />
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
              {tournee.truckPlate && (
                <span>IT : <span className="font-mono text-brand-300">{tournee.truckPlate}</span></span>
              )}
              {tournee.truckLabel && <span>{tournee.truckLabel}</span>}
              {tournee.plannedDate && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {tournee.plannedDate}
                </span>
              )}
              {tournee.fillRatePercent != null && (
                <div className="w-24">
                  <FillBar value={tournee.fillRatePercent} />
                </div>
              )}
              {(tournee.stops ?? []).length > 0 && (
                <span>{tournee.stops!.length} arrêt(s)</span>
              )}
            </div>
            {tournee.rejectionReason && (
              <p className="text-xs text-red-400 mt-1">Motif rejet : {tournee.rejectionReason}</p>
            )}
            {tournee.operatorNotes && (
              <p className="text-xs text-slate-600 italic mt-0.5">« {tournee.operatorNotes} »</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {tournee.status === 'PENDING_RESPONSABLE_VALIDATION' && (
            <>
              <button onClick={onValidate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 border border-emerald-500/20 transition-colors">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Valider
              </button>
              <button onClick={onReject}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-600/15 text-red-400 hover:bg-red-600/25 border border-red-500/20 transition-colors">
                <XCircle className="w-3.5 h-3.5" />
                Rejeter
              </button>
            </>
          )}
          {hasStops && (
            <button onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? 'Masquer' : 'Manifeste'}
            </button>
          )}
        </div>
      </div>

      {/* Inline manifest */}
      {expanded && hasStops && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <PlanningManifest tournees={[tourneeToProposed(tournee)]} readOnly />
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'PENDING_RESPONSABLE_VALIDATION', label: 'En attente' },
  { value: 'VALIDATED',   label: 'Validées' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED',   label: 'Terminées' },
  { value: '',            label: 'Toutes' },
]

export default function ResponsableTourneesPage() {
  const qc = useQueryClient()
  const [confirmValidate, setConfirmValidate] = useState<Tournee | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Tournee | null>(null)
  const [statusFilter, setStatusFilter] = useState('PENDING_RESPONSABLE_VALIDATION')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 3

  const { data: tournees = [], isLoading } = useQuery<Tournee[]>({
    queryKey: ['responsable-tournees', statusFilter],
    queryFn: () => getTourneesResponsable(statusFilter || undefined),
    refetchInterval: 30_000,
  })

  const totalPages = Math.ceil(tournees.length / PAGE_SIZE)
  const pagedTournees = tournees.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const validateMutation = useMutation({
    mutationFn: (id: string) => validateTournee(id),
    onSuccess: () => {
      toast.success('Tournée validée')
      qc.invalidateQueries({ queryKey: ['responsable-tournees'] })
      qc.invalidateQueries({ queryKey: ['responsable-stats'] })
      setConfirmValidate(null)
    },
    onError: () => toast.error('Erreur lors de la validation'),
  })

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Validation tournées" subtitle="Approbation des tournées planifiées" />

      <div className="flex-1 p-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
            className="input-dark text-sm">
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {isLoading && <span className="text-xs text-slate-500">Chargement...</span>}
        </motion.div>

        {isLoading ? <PageLoader /> : tournees.length === 0 ? (
          <EmptyState title="Aucune tournée" description="Aucune tournée à afficher pour ce filtre." />
        ) : (
          <>
            <div className="space-y-4">
              {pagedTournees.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <TourneeCard
                    tournee={t}
                    defaultExpanded={statusFilter === 'PENDING_RESPONSABLE_VALIDATION'}
                    onValidate={() => setConfirmValidate(t)}
                    onReject={() => setRejectTarget(t)}
                  />
                </motion.div>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage}
              totalElements={tournees.length} pageSize={PAGE_SIZE} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmValidate}
        onOpenChange={v => !v && setConfirmValidate(null)}
        title="Valider la tournée"
        description={`Confirmer la validation de "${confirmValidate?.tourneeNumber ?? confirmValidate?.id.substring(0, 8)}" ?`}
        confirmLabel="Valider"
        onConfirm={() => confirmValidate && validateMutation.mutate(confirmValidate.id)}
        loading={validateMutation.isPending}
      />

      {rejectTarget && (
        <RejectModal tournee={rejectTarget} onClose={() => setRejectTarget(null)} />
      )}
    </div>
  )
}
