import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertTriangle, Plus, MessageSquare, CheckCircle2, ChevronRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { getMyIncidents, createIncident, getMyOrders } from '@/api/client.api'
import { useAuthStore } from '@/store/auth.store'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import Pagination from '@/components/shared/Pagination'
import { formatDateTime } from '@/lib/utils'
import type { IncidentSeverity } from '@/types'

const PAGE_SIZE = 4

// ── Predefined incident types ─────────────────────────────────────────────────

const INCIDENT_TYPES: { label: string; defaultSeverity: IncidentSeverity }[] = [
  { label: 'Retard de livraison',         defaultSeverity: 'MEDIUM' },
  { label: 'Véhicule endommagé',          defaultSeverity: 'HIGH'   },
  { label: 'Commande incomplète',         defaultSeverity: 'MEDIUM' },
  { label: 'Mauvaise référence / modèle', defaultSeverity: 'MEDIUM' },
  { label: 'Problème d\'accès au site',   defaultSeverity: 'LOW'    },
  { label: 'Incident en transit',         defaultSeverity: 'HIGH'   },
  { label: 'Documentation manquante',     defaultSeverity: 'LOW'    },
  { label: 'Autre (précisez)',            defaultSeverity: 'MEDIUM' },
]

// ── Schema ────────────────────────────────────────────────────────────────────

const incidentSchema = z.object({
  orderId:     z.string().optional(),
  severity:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  customMotif: z.string().optional(),
  details:     z.string().optional(),
})
type IncidentForm = z.infer<typeof incidentSchema>

// ── Create modal ──────────────────────────────────────────────────────────────

function CreateIncidentModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [selectedType, setSelectedType] = useState<typeof INCIDENT_TYPES[0] | null>(null)
  const [typeError, setTypeError] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<IncidentForm>({
    resolver: zodResolver(incidentSchema),
    defaultValues: { severity: 'MEDIUM', customMotif: '', details: '' },
  })

  const isAutre = selectedType?.label.startsWith('Autre')
  const customMotif = watch('customMotif') ?? ''

  const { data: orders = [] } = useQuery({
    queryKey: ['client-orders', user?.keycloakId],
    queryFn: getMyOrders,
    enabled: !!user?.keycloakId,
  })

  const mutation = useMutation({
    mutationFn: (data: IncidentForm) => {
      const motif = isAutre ? customMotif.trim() : selectedType!.label
      const description = [motif, data.details?.trim()].filter(Boolean).join('\n\n')
      return createIncident({
        description,
        severity: data.severity,
        orderId: data.orderId || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Incident signalé — notre équipe vous contactera')
      qc.invalidateQueries({ queryKey: ['client-incidents', user?.keycloakId] })
      onClose()
    },
    onError: () => toast.error('Erreur lors du signalement'),
  })

  function onSubmit(data: IncidentForm) {
    if (!selectedType) { setTypeError(true); return }
    if (isAutre && !customMotif.trim()) { setTypeError(true); return }
    mutation.mutate(data)
  }

  function handleTypeSelect(t: typeof INCIDENT_TYPES[0]) {
    setSelectedType(t)
    setTypeError(false)
    setValue('severity', t.defaultSeverity)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass p-6 w-full max-w-lg rounded-2xl shadow-2xl overflow-y-auto max-h-[92vh]">

        <h2 className="text-slate-100 font-semibold text-base mb-1">Signaler un incident</h2>
        <p className="text-xs text-slate-500 mb-5">Sélectionnez le type d'incident concerné</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Type selection grid */}
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2 block">
              Type d'incident <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {INCIDENT_TYPES.map(t => (
                <button key={t.label} type="button"
                  onClick={() => handleTypeSelect(t)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-medium border transition-all ${
                    selectedType?.label === t.label
                      ? 'bg-red-600/20 border-red-500/50 text-red-300'
                      : 'bg-navy-800/40 border-navy-600/40 text-slate-400 hover:border-red-500/30 hover:text-slate-200'
                  }`}>
                  {selectedType?.label === t.label
                    ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
                    : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-slate-600" />
                  }
                  <span className="leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
            {typeError && !selectedType && (
              <p className="text-xs text-red-400 mt-1.5">Veuillez sélectionner un type d'incident</p>
            )}
          </div>

          {/* Custom motif — shown when "Autre" is selected */}
          {isAutre && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Motif <span className="text-red-400">*</span>
              </label>
              <input
                {...register('customMotif')}
                className="input-dark w-full"
                placeholder="Décrivez brièvement le motif de l'incident…"
              />
              {typeError && isAutre && !customMotif.trim() && (
                <p className="text-xs text-red-400 mt-1">Le motif est requis</p>
              )}
            </div>
          )}

          {/* Order */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Commande concernée (optionnel)</label>
            <select {...register('orderId')} className="input-dark w-full">
              <option value="">— Aucune commande spécifique —</option>
              {(orders as any[]).map((o: any) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber ?? `#${o.id.substring(0, 8)}`} — {o.status} — {o.requestedDeliveryDate?.split('T')[0] ?? '—'}
                </option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Sévérité</label>
            <select {...register('severity')} className="input-dark w-full">
              <option value="LOW">Faible</option>
              <option value="MEDIUM">Moyenne</option>
              <option value="HIGH">Élevée</option>
              <option value="CRITICAL">Critique</option>
            </select>
          </div>

          {/* Additional details */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Détails supplémentaires (optionnel)</label>
            <textarea {...register('details')} rows={3} className="input-dark w-full resize-none"
              placeholder="Informations complémentaires, numéro de châssis, heure, lieu…" />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50">
              {mutation.isPending ? 'Envoi…' : 'Signaler'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Severity config ───────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<string, string> = {
  LOW:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  MEDIUM:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  HIGH:     'text-orange-400 bg-orange-500/10 border-orange-500/20',
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/20',
}
const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Faible', MEDIUM: 'Moyen', HIGH: 'Élevé', CRITICAL: 'Critique',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClientIncidentsPage() {
  const { user } = useAuthStore()
  const uid = user?.keycloakId

  const [showCreate, setShowCreate] = useState(false)
  const [page, setPage] = useState(0)

  const { data: allIncidents = [], isLoading } = useQuery({
    queryKey: ['client-incidents', uid],
    queryFn: getMyIncidents,
    enabled: !!uid,
    refetchInterval: 30_000,
    staleTime: 0,
  })

  const totalPages = Math.ceil((allIncidents as any[]).length / PAGE_SIZE)
  const incidents = (allIncidents as any[]).slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Mes incidents" subtitle="Signalez et suivez vos incidents" />

      <div className="flex-1 p-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex justify-end">
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Signaler un incident
          </button>
        </motion.div>

        {isLoading ? <PageLoader /> : allIncidents.length === 0 ? (
          <EmptyState
            title="Aucun incident"
            description="Vous n'avez signalé aucun incident pour le moment."
          />
        ) : (
          <>
          <div className="space-y-3">
            {incidents.map((inc: any, i: number) => {
              const sevColor = SEVERITY_CONFIG[inc.severity] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20'
              const sevLabel = SEVERITY_LABELS[inc.severity] ?? inc.severity
              const operatorReply = inc.operatorResponse ?? inc.resolutionNotes ?? inc.response
              return (
                <motion.div key={inc.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-red-600/10 border border-red-500/20 flex-shrink-0 flex items-center justify-center mt-0.5">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${sevColor}`}>
                            {sevLabel}
                          </span>
                          <StatusBadge status={inc.status} />
                          <span className="text-xs font-mono text-slate-600">#{inc.id.substring(0, 8)}</span>
                        </div>

                        {/* First line = motif/type, rest = details */}
                        {(() => {
                          const parts = (inc.description ?? '').split('\n\n')
                          return (
                            <>
                              <p className="text-sm text-slate-100 font-semibold mb-0.5">{parts[0]}</p>
                              {parts.length > 1 && (
                                <p className="text-xs text-slate-400 mb-1 whitespace-pre-line">{parts.slice(1).join('\n\n')}</p>
                              )}
                            </>
                          )
                        })()}
                        <p className="text-xs text-slate-500">Signalé le {formatDateTime(inc.createdAt)}</p>

                        {/* Operator response */}
                        {operatorReply && (
                          <div className="mt-3 p-3 rounded-lg bg-emerald-600/10 border border-emerald-500/20">
                            <div className="flex items-center gap-1.5 mb-1">
                              <MessageSquare className="w-3 h-3 text-emerald-400" />
                              <p className="text-xs text-emerald-400 font-medium">Réponse de l'équipe</p>
                            </div>
                            <p className="text-xs text-slate-300">{operatorReply}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
          <div className="glass mt-2 rounded-xl">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalElements={(allIncidents as any[]).length}
              pageSize={PAGE_SIZE}
            />
          </div>
          </>
        )}
      </div>

      {showCreate && <CreateIncidentModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
