import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Ban, ChevronRight, Download, Send, Clock, Search, CalendarDays, Mail, Phone, User, MapPin, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { getCancellations, forwardCancellation, downloadCancellationDocument } from '@/api/operateur.api'
import { getUserById } from '@/api/admin.api'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatDateTime } from '@/lib/utils'

function ClientDetailInline({ clientId, clientName, clientCode, clientCompany }: {
  clientId?: string; clientName?: string; clientCode?: string; clientCompany?: string
}) {
  const { data: user } = useQuery({
    queryKey: ['user-info', clientId],
    queryFn: () => getUserById(clientId!),
    enabled: !!clientId,
    staleTime: 60_000,
  })

  const phone   = (user as any)?.attributes?.phone?.[0]   || (user as any)?.phone   || null
  const city    = (user as any)?.attributes?.city?.[0]    || null
  const company = clientCompany || (user as any)?.attributes?.company?.[0] || (user as any)?.company || null

  return (
    <div className="mt-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <User className="w-3 h-3 text-amber-400" />
        <span className="text-xs font-semibold text-amber-300">{clientName || '—'}</span>
        {clientCode && (
          <span className="text-[10px] font-mono text-amber-500/70 bg-amber-500/10 px-1.5 py-0.5 rounded">
            {clientCode}
          </span>
        )}
      </div>
      {user?.email && (
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Mail className="w-3 h-3 text-amber-400/60 flex-shrink-0" />
          <span>{user.email}</span>
        </div>
      )}
      {phone && (
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Phone className="w-3 h-3 text-amber-400/60 flex-shrink-0" />
          <span>{phone}</span>
        </div>
      )}
      {company && (
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Building2 className="w-3 h-3 text-amber-400/60 flex-shrink-0" />
          <span>{company}</span>
        </div>
      )}
      {city && (
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <MapPin className="w-3 h-3 text-amber-400/60 flex-shrink-0" />
          <span>{city}</span>
        </div>
      )}
    </div>
  )
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING_OPERATEUR:    { label: 'À transmettre',        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  PENDING_RESPONSABLE:  { label: 'Chez le responsable',  color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  APPROVED:             { label: 'Approuvée',            color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  REJECTED:             { label: 'Rejetée',              color: 'text-red-400 bg-red-500/10 border-red-500/20' },
}

export default function OperateurCancellationsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter,   setDateFilter]   = useState('')
  const [searchFilter, setSearchFilter] = useState('')

  const { data: cancellations = [], isLoading } = useQuery<any[]>({
    queryKey: ['operateur-cancellations'],
    queryFn: getCancellations,
    refetchInterval: 30_000,
  })

  const filtered = cancellations.filter((c: any) => {
    if (statusFilter && c.status !== statusFilter) return false
    if (dateFilter && c.createdAt?.split('T')[0] !== dateFilter) return false
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      const orderRef = (c.orderNumber ?? c.orderId ?? '').toLowerCase()
      const client = `${c.clientCompany ?? ''} ${c.clientName ?? ''} ${c.clientCode ?? ''}`.toLowerCase()
      const reason = (c.reason ?? '').toLowerCase()
      if (!orderRef.includes(q) && !client.includes(q) && !reason.includes(q)) return false
    }
    return true
  })

  const forwardMutation = useMutation({
    mutationFn: (id: string) => forwardCancellation(id),
    onSuccess: () => {
      toast.success('Demande transmise au responsable')
      qc.invalidateQueries({ queryKey: ['operateur-cancellations'] })
    },
    onError: () => toast.error('Erreur lors de la transmission'),
  })

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Demandes d'annulation"
        subtitle="Gérez les demandes d'annulation de commandes clients"
      />

      <div className="flex-1 p-6 space-y-5">
        {/* Filter bar */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Rechercher commande / client / motif..."
              className="input-dark pl-9 text-sm w-64"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="input-dark text-sm">
            <option value="">Tous les statuts</option>
            <option value="PENDING_OPERATEUR">À transmettre</option>
            <option value="PENDING_RESPONSABLE">Chez le responsable</option>
            <option value="APPROVED">Approuvées</option>
            <option value="REJECTED">Rejetées</option>
          </select>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="input-dark pl-9 text-sm w-44"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          {(searchFilter || statusFilter || dateFilter) && (
            <span className="text-xs text-slate-500">{filtered.length} résultat(s)</span>
          )}
        </motion.div>

        {isLoading ? <PageLoader /> : filtered.length === 0 ? (
          <EmptyState
            title="Aucune demande d'annulation"
            description="Les demandes d'annulation des clients apparaîtront ici."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((c: any, i: number) => {
              const st = STATUS_LABEL[c.status] ?? { label: c.status, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' }
              const allVehicles   = parseVehicles(c.allVehiclesJson)
              const reqVehicles   = parseVehicles(c.requestedVehiclesJson)
              const isPartial     = reqVehicles.length < allVehicles.length && reqVehicles.length > 0
              const canForward    = c.status === 'PENDING_OPERATEUR'
              const canDownload   = c.status === 'APPROVED' && c.documentData != null

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
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${st.color}`}>
                            {st.label}
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            {c.orderNumber ?? `#${c.orderId?.substring(0, 8)}`}
                          </span>
                          {isPartial && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                              Partielle ({reqVehicles.length}/{allVehicles.length} véh.)
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 mb-1.5">
                          <span className="text-slate-500">Motif : </span>{c.reason || '—'}
                        </p>
                        <ClientDetailInline
                          clientId={c.clientId?.startsWith('chauffeur:') ? c.clientId.replace('chauffeur:', '') : c.clientId}
                          clientName={c.clientName}
                          clientCode={c.clientCode}
                          clientCompany={c.clientCompany}
                        />

                        {/* Vehicles requested */}
                        {reqVehicles.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {reqVehicles.slice(0, 5).map((v: any, vi: number) => (
                              <span key={vi}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                {v.chassisId ?? v.vehicleModelLabel ?? '—'}
                              </span>
                            ))}
                            {reqVehicles.length > 5 && (
                              <span className="text-[10px] text-slate-500">+{reqVehicles.length - 5}</span>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(c.createdAt)}
                        </p>

                        {c.rejectionReason && (
                          <p className="text-xs text-red-400 mt-1">Rejetée : {c.rejectionReason}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {canForward && (
                        <button
                          onClick={() => forwardMutation.mutate(c.id)}
                          disabled={forwardMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors disabled:opacity-50 whitespace-nowrap">
                          <Send className="w-3.5 h-3.5" />
                          Transmettre au respo
                        </button>
                      )}
                      {canDownload && (
                        <button
                          onClick={() => downloadCancellationDocument(c.id, c.orderNumber)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors whitespace-nowrap">
                          <Download className="w-3.5 h-3.5" />
                          Télécharger PDF
                        </button>
                      )}
                      {c.status === 'PENDING_RESPONSABLE' && (
                        <div className="flex items-center gap-1 text-xs text-blue-400 px-2 py-1">
                          <ChevronRight className="w-3 h-3" />
                          En attente respo
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function parseVehicles(json?: string): any[] {
  if (!json) return []
  try { return JSON.parse(json) } catch { return [] }
}
