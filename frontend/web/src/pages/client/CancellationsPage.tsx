import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Ban, Search, CalendarDays, CheckCircle2, XCircle, Clock, Plus, Package, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { getMyOrders, requestOrderCancellation } from '@/api/client.api'
import { useAuthStore } from '@/store/auth.store'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import Pagination from '@/components/shared/Pagination'
import { formatDateTime } from '@/lib/utils'

const PAGE_SIZE = 5

const CANCELLABLE_STATUSES  = ['PENDING_VALIDATION', 'VALIDATED', 'PLANNED']
const CANCEL_RESULT_STATUSES = ['CANCELLATION_REQUESTED', 'CANCELLATION_PENDING', 'CANCELLED', 'CANCELLATION_REJECTED']

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  CANCELLATION_REQUESTED: { label: 'En attente opérateur',    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',    icon: Clock },
  CANCELLATION_PENDING:   { label: 'En attente responsable',  color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',    icon: Clock },
  CANCELLED:              { label: 'Annulation acceptée',     color: 'text-red-400 bg-red-500/10 border-red-500/20',          icon: CheckCircle2 },
  CANCELLATION_REJECTED:  { label: 'Annulation refusée',      color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: XCircle },
}

function formatAddress(addr: any): string {
  if (!addr) return '—'
  if (typeof addr === 'string') { try { addr = JSON.parse(addr) } catch { return addr } }
  return [addr.street, addr.city].filter(Boolean).join(', ') || '—'
}

// ── Formulaire de demande d'annulation ────────────────────────────────────────

function NewCancellationModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [reason, setReason] = useState('')
  const [partialMode, setPartialMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [expanded, setExpanded] = useState(false)

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['client-orders', user?.keycloakId],
    queryFn: getMyOrders,
  })

  const cancellable = (allOrders as any[]).filter(o => CANCELLABLE_STATUSES.includes(o.status))

  const mutation = useMutation({
    mutationFn: () => requestOrderCancellation(
      selectedOrder!.id,
      reason,
      partialMode && selectedIds.length > 0 ? selectedIds : undefined,
    ),
    onSuccess: () => {
      toast.success('Demande d\'annulation envoyée à l\'opérateur')
      qc.invalidateQueries({ queryKey: ['client-orders', user?.keycloakId] })
      onClose()
    },
    onError: () => toast.error('Erreur lors de la demande d\'annulation'),
  })

  const vehicles: any[] = selectedOrder?.vehicles ?? []
  const canSubmit = !!selectedOrder && reason.trim().length >= 5 && (!partialMode || selectedIds.length > 0)

  function toggleVehicle(chassisId: string) {
    setSelectedIds(p => p.includes(chassisId) ? p.filter(id => id !== chassisId) : [...p, chassisId])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass p-6 w-full max-w-lg rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">

        {/* En-tête */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center">
            <Ban className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h2 className="text-slate-100 font-semibold text-base">Demande d'annulation</h2>
            <p className="text-xs text-slate-500">Sélectionnez la commande et indiquez le motif</p>
          </div>
        </div>

        <div className="space-y-4">

          {/* Étape 1 — Choisir la commande */}
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2 block">
              1. Commande à annuler
            </label>
            {isLoading ? (
              <p className="text-xs text-slate-500 py-2">Chargement des commandes...</p>
            ) : cancellable.length === 0 ? (
              <div className="rounded-lg px-4 py-3 bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-400">Aucune commande annulable pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {cancellable.map((o: any) => (
                  <button key={o.id}
                    onClick={() => { setSelectedOrder(o); setPartialMode(false); setSelectedIds([]) }}
                    className={`w-full text-left rounded-xl px-4 py-3 border transition-all ${
                      selectedOrder?.id === o.id
                        ? 'border-brand-500/60 bg-brand-600/15'
                        : 'border-navy-600/40 bg-navy-800/40 hover:border-navy-500/60'
                    }`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-brand-300 truncate">
                          {o.orderNumber ?? `#${o.id?.substring(0, 8)}`}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
                          <p className="text-[11px] text-slate-400 truncate">{formatAddress(o.deliveryAddress)}</p>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          {(o.vehicles ?? []).length} véhicule(s) · {o.requestedDeliveryDate?.split('T')[0]}
                        </p>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Étape 2 — Périmètre (partiel / total) */}
          {selectedOrder && vehicles.length > 1 && (
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2 block">
                2. Périmètre d'annulation
              </label>
              <div className="flex gap-2">
                <button onClick={() => { setPartialMode(false); setSelectedIds([]) }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                    !partialMode ? 'border-brand-500 bg-brand-600/20 text-brand-300' : 'border-navy-600/40 text-slate-400 hover:border-navy-500'
                  }`}>
                  Annulation totale
                </button>
                <button onClick={() => setPartialMode(true)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                    partialMode ? 'border-brand-500 bg-brand-600/20 text-brand-300' : 'border-navy-600/40 text-slate-400 hover:border-navy-500'
                  }`}>
                  Annulation partielle
                </button>
              </div>

              {partialMode && (
                <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                  {vehicles.slice(0, expanded ? vehicles.length : 4).map((v: any) => (
                    <label key={v.chassisId}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-navy-800/60 border border-navy-700/40 cursor-pointer hover:bg-navy-700/40 transition-colors">
                      <input type="checkbox"
                        checked={selectedIds.includes(v.chassisId)}
                        onChange={() => toggleVehicle(v.chassisId)}
                        className="accent-brand-500 w-3.5 h-3.5" />
                      <span className="font-mono text-xs text-slate-300">{v.chassisId}</span>
                      <span className="text-[10px] text-slate-500 ml-auto">{v.vehicleModelLabel}</span>
                    </label>
                  ))}
                  {vehicles.length > 4 && (
                    <button onClick={() => setExpanded(v => !v)}
                      className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 px-3 py-1">
                      {expanded ? <><ChevronUp className="w-3 h-3" /> Réduire</> : <><ChevronDown className="w-3 h-3" /> +{vehicles.length - 4} de plus</>}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Étape 3 — Motif */}
          {selectedOrder && (
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2 block">
                {vehicles.length > 1 ? '3.' : '2.'} Motif d'annulation <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Expliquez la raison de cette annulation (minimum 5 caractères)..."
                rows={3}
                className="input-dark w-full resize-none text-sm"
              />
              <p className="text-[10px] text-slate-600 mt-1">{reason.trim().length} / 5 caractères minimum</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600/80 hover:bg-red-600 text-white transition-colors disabled:opacity-40">
            <Ban className="w-3.5 h-3.5" />
            {mutation.isPending ? 'Envoi...' : 'Envoyer la demande'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function ClientCancellationsPage() {
  const { user } = useAuthStore()
  const [showNew,      setShowNew]      = useState(false)
  const [search,       setSearch]       = useState('')
  const [dateFilter,   setDate]         = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page,         setPage]         = useState(0)

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ['client-orders', user?.keycloakId],
    queryFn: getMyOrders,
    refetchInterval: 30_000,
  })

  const cancellations = (allOrders as any[]).filter(o => CANCEL_RESULT_STATUSES.includes(o.status))
  const cancellable   = (allOrders as any[]).filter(o => CANCELLABLE_STATUSES.includes(o.status))

  const filtered = cancellations.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false
    if (dateFilter && o.updatedAt?.split('T')[0] !== dateFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!`${o.orderNumber ?? ''} ${formatAddress(o.deliveryAddress)}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const items = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Mes Annulations" subtitle="Gérez vos demandes d'annulation de commandes" />

      <div className="flex-1 p-6 space-y-5">

        {/* Toolbar */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 flex-wrap">

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
                placeholder="N° commande, adresse..." className="input-dark pl-9 text-sm w-52" />
            </div>

            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
              className="input-dark text-sm">
              <option value="">Tous les statuts</option>
              <option value="CANCELLATION_REQUESTED">En attente opérateur</option>
              <option value="CANCELLATION_PENDING">En attente responsable</option>
              <option value="CANCELLED">Acceptée</option>
              <option value="CANCELLATION_REJECTED">Refusée</option>
            </select>

            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <input type="date" value={dateFilter} onChange={e => { setDate(e.target.value); setPage(0) }}
                className="input-dark pl-9 text-sm w-44" style={{ colorScheme: 'dark' }} />
            </div>
          </div>

          {/* Bouton nouvelle demande */}
          <button
            onClick={() => setShowNew(true)}
            disabled={cancellable.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={cancellable.length === 0 ? 'Aucune commande annulable' : ''}>
            <Plus className="w-4 h-4" />
            Nouvelle demande
          </button>
        </motion.div>

        {/* Compteurs */}
        {!isLoading && cancellations.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 flex-wrap">
            {Object.entries(STATUS_CFG).map(([status, cfg]) => {
              const count = cancellations.filter(o => o.status === status).length
              if (!count) return null
              return (
                <div key={status} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${cfg.color}`}>
                  <cfg.icon className="w-3.5 h-3.5" />
                  {count} {cfg.label}
                </div>
              )
            })}
          </motion.div>
        )}

        {/* Liste */}
        {isLoading ? <PageLoader /> : filtered.length === 0 ? (
          <EmptyState
            title={cancellations.length === 0 ? 'Aucune demande d\'annulation' : 'Aucun résultat'}
            description={cancellations.length === 0
              ? 'Cliquez sur "Nouvelle demande" pour annuler une commande.'
              : 'Aucune annulation ne correspond aux filtres.'}
          />
        ) : (
          <>
            <div className="space-y-3">
              {items.map((order: any, i: number) => {
                const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.CANCELLATION_REQUESTED
                const Icon = cfg.icon
                return (
                  <motion.div key={order.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 border ${cfg.color}`}>
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-semibold text-slate-100 font-mono">
                              {order.orderNumber ?? `#${order.id?.substring(0, 8)}`}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border flex items-center gap-1 ${cfg.color}`}>
                              <Icon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1.5">
                            <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                            {formatAddress(order.deliveryAddress)}
                          </div>

                          <p className="text-[10px] text-slate-600 mb-2">
                            {(order.vehicles ?? []).length} véhicule(s) · Demande le {formatDateTime(order.updatedAt ?? order.createdAt)}
                          </p>

                          {order.cancellationReason && (
                            <div className="p-2.5 rounded-lg bg-amber-500/8 border border-amber-500/20 mb-1.5">
                              <p className="text-[10px] text-amber-400 font-medium mb-0.5">Votre motif</p>
                              <p className="text-xs text-slate-300">{order.cancellationReason}</p>
                            </div>
                          )}

                          {order.status === 'CANCELLATION_REJECTED' && order.rejectionReason && (
                            <div className="p-2.5 rounded-lg bg-orange-500/8 border border-orange-500/20">
                              <p className="text-[10px] text-orange-400 font-medium mb-0.5">Motif de refus</p>
                              <p className="text-xs text-slate-300">{order.rejectionReason}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  </motion.div>
                )
              })}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage}
              totalElements={filtered.length} pageSize={PAGE_SIZE} />
          </>
        )}
      </div>

      {showNew && <NewCancellationModal onClose={() => setShowNew(false)} />}
    </div>
  )
}
