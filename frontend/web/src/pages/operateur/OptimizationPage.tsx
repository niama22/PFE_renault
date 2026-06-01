import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Truck, Send, Settings, AlertCircle,
  CheckCircle2, RotateCcw, ChevronDown,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getOptimizationConfigOperateur,
  runOptimizationOperateur,
  confirmPlanningOperateur,
} from '@/api/operateur.api'
import Header from '@/components/layout/Header'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { PlanningManifest, FillBar, recalcTournee } from '@/components/shared/PlanningManifest'
import { usePlanningStore } from '@/store/planning.store'
import type { OptimizationResult, ProposedTournee, DeliveryStop, ConfirmedTourneeDto } from '@/types'

const ORIGIN = 'MELLOUSSA TANGER'

// ── Confirmed panel ───────────────────────────────────────────────────────────

function ConfirmedPanel({ confirmed, onReset }: { confirmed: ConfirmedTourneeDto[]; onReset: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="glass p-6 border border-emerald-500/20">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-200">{confirmed.length} tournée(s) soumises au responsable</p>
          <p className="text-xs text-slate-500 mt-0.5">En attente de validation finale. Consultez l'onglet <span className="text-brand-400">Tournées</span>.</p>
        </div>
      </div>

      <div className="space-y-2 mb-5">
        {confirmed.map(t => (
          <div key={t.id}
            className="flex items-center gap-4 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Truck className="w-4 h-4 text-brand-400 flex-shrink-0" />
            <span className="text-xs font-mono font-semibold text-slate-200">{t.tourneeNumber}</span>
            <span className="text-xs text-slate-500 flex-1">IT : <span className="font-mono text-brand-300">{t.truckPlate}</span> — {t.truckLabel}</span>
            <span className="text-xs text-slate-400">{t.orderCount} arrêt(s)</span>
            <span className="text-xs text-slate-400">{new Date(t.plannedDate).toLocaleDateString('fr-FR')}</span>
            <span className={`text-xs font-medium ${t.fillRatePercent >= 80 ? 'text-emerald-400' : t.fillRatePercent >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
              {t.fillRatePercent.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      <button onClick={onReset}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
        <RotateCcw className="w-4 h-4" /> Nouvelle optimisation
      </button>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OperateurOptimizationPage() {
  const { proposed, confirmed: storeConfirmed, setProposed, setConfirmed, reset } = usePlanningStore()

  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [editableTournees, setEditableTournees] = useState<ProposedTournee[]>(proposed)
  const [showUnscheduled, setShowUnscheduled] = useState(false)

  const { data: savedConfig, isLoading: configLoading } = useQuery({
    queryKey: ['optimization-config-op'],
    queryFn: getOptimizationConfigOperateur,
  })

  useEffect(() => {
    if (result) {
      const withDates = result.proposedTournees.map(t => ({
        ...t,
        plannedDate: t.plannedDate ?? new Date(Date.now() + 86400000).toISOString().split('T')[0],
      }))
      setEditableTournees(withDates)
      setProposed(withDates)
    }
  }, [result])

  const runMutation = useMutation({
    mutationFn: () => runOptimizationOperateur(savedConfig ?? undefined),
    onSuccess: (data) => {
      if (!data) return
      setResult(data)
      toast.success(data.message)
    },
    onError: () => toast.error("Erreur lors de l'optimisation"),
  })

  const confirmMutation = useMutation({
    mutationFn: (tournees: ProposedTournee[]) =>
      confirmPlanningOperateur(tournees.filter(t => t.stops.length > 0)),
    onSuccess: (data) => {
      const confirmed = data ?? []
      setConfirmed(confirmed)
      setResult(null)
      setEditableTournees([])
      toast.success('Planning envoyé au responsable pour validation')
    },
    onError: () => toast.error('Erreur lors de la confirmation du planning'),
  })

  function handleReset() {
    reset()
    setResult(null)
    setEditableTournees([])
  }

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
      const updatedTo   = recalcTournee({ ...to, stops: [...to.stops, stop] })
      const updated = prev.map(t => {
        if (t.truckId === fromTruckId) return updatedFrom
        if (t.truckId === toTruckId)   return updatedTo
        return t
      })
      setProposed(updated)
      return updated
    })
  }

  const activeTournees = editableTournees.filter(t => t.stops.length > 0)
  const hasConfirmed = storeConfirmed && storeConfirmed.length > 0

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Planification des tournées"
        subtitle="Moteur d'optimisation — manifeste de livraison par IT (Identifiant Transport)"
      />

      <div className="flex-1 p-6 space-y-5">

        {/* Info banner */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="glass p-4 flex items-center gap-3 border border-blue-500/20">
          <Send className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <p className="text-xs text-slate-400">
            Origine : <span className="text-emerald-400 font-medium">{ORIGIN}</span> — Le plan est soumis au{' '}
            <span className="text-blue-400">responsable</span> pour approbation finale.
            Chaque camion reçoit un <span className="text-slate-200">IT (Identifiant Transport)</span>.
          </p>
        </motion.div>

        {/* Config + Launch */}
        {!hasConfirmed && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="glass p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-200">Paramètres du responsable</h3>
            </div>
            {configLoading ? (
              <p className="text-xs text-slate-500">Chargement...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="glass p-3 text-center rounded-lg">
                  <p className="text-xl font-bold text-brand-400">{savedConfig?.clusterRadiusKm ?? 80} km</p>
                  <p className="text-xs text-slate-500 mt-0.5">Rayon de clustering</p>
                </div>
                <div className="glass p-3 text-center rounded-lg">
                  <p className="text-xl font-bold text-emerald-400">
                    ±{savedConfig?.dateWindowDays ?? 1} jour{(savedConfig?.dateWindowDays ?? 1) > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Fenêtre de date</p>
                </div>
                <button
                  onClick={() => runMutation.mutate()}
                  disabled={runMutation.isPending || configLoading}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors disabled:opacity-50">
                  <Zap className="w-4 h-4" />
                  {runMutation.isPending ? 'Calcul...' : result ? 'Relancer' : 'Lancer la planification'}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Loading */}
        {runMutation.isPending && (
          <div className="flex flex-col items-center py-12 gap-3">
            <PageLoader />
            <p className="text-sm text-slate-400">Clarke-Wright + clustering géographique + vérification dimensions...</p>
          </div>
        )}

        {/* Confirmed */}
        {hasConfirmed && (
          <ConfirmedPanel confirmed={storeConfirmed!} onReset={handleReset} />
        )}

        {/* Results */}
        {result && !runMutation.isPending && !hasConfirmed && (
          <AnimatePresence>
            <div className="space-y-5">

              {/* Summary stats */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'ITs proposés', value: editableTournees.length, color: 'text-brand-400' },
                  { label: 'Châssis planifiés', value: `${result.scheduledOrders}/${result.totalOrders}`, color: 'text-emerald-400' },
                  { label: 'Taux remplissage moyen', value: `${result.averageFillRate}%`, color: 'text-amber-400' },
                  { label: 'Non planifiés', value: result.unscheduledOrderIds.length, color: result.unscheduledOrderIds.length > 0 ? 'text-red-400' : 'text-slate-500' },
                ].map(s => (
                  <div key={s.label} className="glass p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </motion.div>

              {/* Unscheduled */}
              {result.unscheduledOrderIds.length > 0 && (
                <div className="glass p-4">
                  <button onClick={() => setShowUnscheduled(o => !o)} className="flex items-center gap-3 w-full text-left">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-slate-400 flex-1">
                      <span className="text-amber-400 font-medium">{result.unscheduledOrderIds.length} châssis</span> non planifiés — capacité insuffisante.
                    </p>
                    <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${showUnscheduled ? 'rotate-180' : ''}`} />
                  </button>
                  {showUnscheduled && (
                    <div className="mt-3 flex flex-wrap gap-1.5 pl-7">
                      {result.unscheduledOrderIds.map(id => (
                        <span key={id} className="text-xs font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">{id.slice(0, 8)}…</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Manifest */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-brand-400" />
                    <h3 className="text-sm font-semibold text-slate-200">Manifeste de livraison</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/25">
                      {editableTournees.length} IT · {editableTournees.reduce((s, t) => s + t.stops.length, 0)} arrêts
                    </span>
                  </div>
                </div>

                <PlanningManifest
                  tournees={editableTournees}
                  onDateChange={updateDate}
                  onMove={moveStop}
                />
              </div>

              {/* Confirm button */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between px-5 py-4 rounded-xl border border-emerald-500/20"
                style={{ background: 'rgba(16,185,129,0.05)' }}>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Valider ce planning ?</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeTournees.length} IT · {activeTournees.reduce((s, t) => s + t.stops.length, 0)} arrêts · {activeTournees.reduce((s, t) => s + t.stops.reduce((ss, stop) => ss + (stop.chassisIds?.length ?? stop.quantity), 0), 0)} châssis
                  </p>
                </div>
                <button
                  onClick={() => confirmMutation.mutate(editableTournees)}
                  disabled={confirmMutation.isPending || activeTournees.length === 0}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50">
                  <Send className="w-4 h-4" />
                  {confirmMutation.isPending ? 'Envoi...' : 'Confirmer & Envoyer au Responsable'}
                </button>
              </motion.div>

            </div>
          </AnimatePresence>
        )}

        {/* Restored from store (not fresh result) */}
        {!result && !runMutation.isPending && !hasConfirmed && editableTournees.length > 0 && (
          <AnimatePresence>
            <div className="space-y-5">
              <div className="glass p-3 flex items-center gap-3 border border-amber-500/20">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-slate-400">Planning en cours d'édition — non encore soumis au responsable.</p>
                <button onClick={handleReset} className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Réinitialiser
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-brand-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Manifeste de livraison</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/25">
                    {editableTournees.length} IT · {editableTournees.reduce((s, t) => s + t.stops.length, 0)} arrêts
                  </span>
                </div>
                <PlanningManifest
                  tournees={editableTournees}
                  onDateChange={updateDate}
                  onMove={moveStop}
                />
              </div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between px-5 py-4 rounded-xl border border-emerald-500/20"
                style={{ background: 'rgba(16,185,129,0.05)' }}>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Valider ce planning ?</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeTournees.length} IT · {activeTournees.reduce((s, t) => s + t.stops.length, 0)} arrêts
                  </p>
                </div>
                <button
                  onClick={() => confirmMutation.mutate(editableTournees)}
                  disabled={confirmMutation.isPending || activeTournees.length === 0}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50">
                  <Send className="w-4 h-4" />
                  {confirmMutation.isPending ? 'Envoi...' : 'Confirmer & Envoyer au Responsable'}
                </button>
              </motion.div>
            </div>
          </AnimatePresence>
        )}

        {/* Empty state */}
        {!result && !runMutation.isPending && !hasConfirmed && editableTournees.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-brand-400 opacity-60" />
            </div>
            <p className="text-slate-300 font-medium mb-1">Prêt à planifier</p>
            <p className="text-sm text-slate-500 max-w-md">
              Origine : <span className="text-emerald-400">{ORIGIN}</span>. Le moteur regroupe les châssis par zone et date,
              puis affecte les camions (IT) en optimisant le taux de remplissage.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
