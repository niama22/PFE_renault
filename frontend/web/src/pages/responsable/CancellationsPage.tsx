import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Ban, Download, CheckCircle2, XCircle, Clock } from 'lucide-react'
import UserInfoButton from '@/components/shared/UserInfoButton'
import { toast } from 'sonner'
import {
  getResponsableCancellations,
  approveCancellation,
  rejectCancellation,
  downloadCancellationDocumentRespo,
} from '@/api/responsable.api'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatDateTime } from '@/lib/utils'

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  PENDING_RESPONSABLE: { label: 'En attente de décision', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  APPROVED:            { label: 'Approuvée',              color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  REJECTED:            { label: 'Rejetée',                color: 'text-red-400 bg-red-500/10 border-red-500/20' },
}

export default function ResponsableCancellationsPage() {
  const qc = useQueryClient()
  const [rejectId,  setRejectId]  = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: cancellations = [], isLoading } = useQuery<any[]>({
    queryKey: ['responsable-cancellations'],
    queryFn: getResponsableCancellations,
    refetchInterval: 30_000,
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveCancellation(id),
    onSuccess: () => {
      toast.success('Annulation approuvée — document généré')
      qc.invalidateQueries({ queryKey: ['responsable-cancellations'] })
    },
    onError: () => toast.error('Erreur lors de l\'approbation'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectCancellation(id, reason),
    onSuccess: () => {
      toast.success('Annulation rejetée')
      qc.invalidateQueries({ queryKey: ['responsable-cancellations'] })
      setRejectId(null)
      setRejectReason('')
    },
    onError: () => toast.error('Erreur lors du rejet'),
  })

  const pending    = cancellations.filter(c => c.status === 'PENDING_RESPONSABLE')
  const processed  = cancellations.filter(c => c.status !== 'PENDING_RESPONSABLE')

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Validation des annulations"
        subtitle="Approuvez ou rejetez les demandes d'annulation de commandes"
      />

      <div className="flex-1 p-6 space-y-6">

        {isLoading ? <PageLoader /> : (
          <>
            {/* Pending section */}
            {pending.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  En attente de décision ({pending.length})
                </h3>
                <div className="space-y-3">
                  {pending.map((c: any, i: number) => (
                    <CancellationCard
                      key={c.id} c={c} i={i}
                      onApprove={() => approveMutation.mutate(c.id)}
                      onReject={() => { setRejectId(c.id); setRejectReason('') }}
                      approving={approveMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Processed */}
            {processed.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                  Traitées ({processed.length})
                </h3>
                <div className="space-y-3">
                  {processed.map((c: any, i: number) => (
                    <CancellationCard
                      key={c.id} c={c} i={i}
                      readOnly
                    />
                  ))}
                </div>
              </div>
            )}

            {cancellations.length === 0 && (
              <EmptyState
                title="Aucune demande d'annulation"
                description="Les demandes transmises par l'opérateur apparaîtront ici."
              />
            )}
          </>
        )}
      </div>

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRejectId(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 glass p-6 w-full max-w-md rounded-2xl shadow-2xl">
            <h2 className="text-slate-100 font-semibold mb-1">Rejeter la demande</h2>
            <p className="text-xs text-slate-500 mb-4">Précisez le motif du rejet pour le client et l'opérateur.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              className="input-dark w-full resize-none mb-4"
              placeholder="Motif du rejet (requis)…"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setRejectId(null)}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
                Annuler
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: rejectId, reason: rejectReason })}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50">
                {rejectMutation.isPending ? 'Rejet…' : 'Confirmer le rejet'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

function CancellationCard({
  c, i, onApprove, onReject, approving, readOnly,
}: {
  c: any; i: number
  onApprove?: () => void
  onReject?: () => void
  approving?: boolean
  readOnly?: boolean
}) {
  const st   = STATUS_CFG[c.status] ?? { label: c.status, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' }
  const reqV = parseVehicles(c.requestedVehiclesJson)
  const allV = parseVehicles(c.allVehiclesJson)
  const isPartial = reqV.length < allV.length && reqV.length > 0

  return (
    <motion.div key={c.id}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="glass p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-red-600/10 border border-red-500/20 flex-shrink-0 flex items-center justify-center mt-0.5">
            <Ban className="w-4 h-4 text-red-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${st.color}`}>
                {st.label}
              </span>
              <span className="text-xs font-mono text-slate-500">
                {c.orderNumber ?? `#${c.orderId?.substring(0, 8)}`}
              </span>
              {isPartial && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  Partielle ({reqV.length}/{allV.length} véh.)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="text-sm font-semibold text-slate-100">
                {c.clientCompany || c.clientName || c.clientCode || '—'}
              </p>
              {c.clientId && (
                <UserInfoButton
                  userId={c.clientId.startsWith('chauffeur:') ? c.clientId.replace('chauffeur:', '') : c.clientId}
                  label={c.clientCode ?? 'Client'}
                  variant="client"
                />
              )}
            </div>
            <p className="text-xs text-slate-400 mb-1">Motif : {c.reason || '—'}</p>

            {reqV.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {reqV.slice(0, 6).map((v: any, vi: number) => (
                  <span key={vi}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                    {v.chassisId ?? v.vehicleModelLabel ?? '—'}
                  </span>
                ))}
                {reqV.length > 6 && <span className="text-[10px] text-slate-500">+{reqV.length - 6}</span>}
              </div>
            )}

            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span>Créé : {formatDateTime(c.createdAt)}</span>
              {c.operateurId && <span>Opérateur : {c.operateurId.substring(0, 8)}</span>}
            </div>

            {c.rejectionReason && (
              <p className="text-xs text-red-400 mt-1">Motif rejet : {c.rejectionReason}</p>
            )}
          </div>
        </div>

        {!readOnly && (
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button onClick={onApprove} disabled={approving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors disabled:opacity-50 whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approuver
            </button>
            <button onClick={onReject}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 transition-colors whitespace-nowrap">
              <XCircle className="w-3.5 h-3.5" />
              Rejeter
            </button>
          </div>
        )}

        {readOnly && c.status === 'APPROVED' && c.documentData != null && (
          <button onClick={() => downloadCancellationDocumentRespo(c.id, c.orderNumber)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors whitespace-nowrap flex-shrink-0">
            <Download className="w-3.5 h-3.5" />
            Télécharger PDF
          </button>
        )}
      </div>
    </motion.div>
  )
}

function parseVehicles(json?: string): any[] {
  if (!json) return []
  try { return JSON.parse(json) } catch { return [] }
}
