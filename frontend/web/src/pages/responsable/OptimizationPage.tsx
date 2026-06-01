import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Zap, Truck, MapPin, Package, BarChart3,
  ChevronDown, ChevronRight, AlertCircle,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { runOptimization, getTourneesResponsable } from '@/api/responsable.api'
import Header from '@/components/layout/Header'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import type { OptimizationResult, ProposedTournee, Tournee } from '@/types'

function FillBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-300 w-10 text-right">{value.toFixed(1)}%</span>
    </div>
  )
}

function ProposedTourneeCard({ tournee, index }: { tournee: ProposedTournee; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/2 transition-colors text-left">
        <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
          <Truck className="w-5 h-5 text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200">{tournee.truckLabel}</p>
          <p className="text-xs text-slate-500 font-mono">{tournee.truckPlate}</p>
        </div>
        <div className="flex items-center gap-6 text-xs text-slate-500 flex-shrink-0">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {tournee.totalOrders} arrêt(s)
          </span>
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" /> {tournee.totalWeightKg.toLocaleString('fr-FR')} kg
          </span>
          {tournee.estimatedDistanceKm > 0 && (
            <span>{tournee.estimatedDistanceKm.toFixed(0)} km</span>
          )}
          <div className="w-28">
            <FillBar value={tournee.fillRatePercent} />
          </div>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
               : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-2" style={{ borderTop: '1px solid var(--border-row)' }}>
          <div className="grid grid-cols-3 gap-3 py-3 text-xs text-slate-500">
            <span>Poids chargé : <span className="text-slate-300 font-medium">{tournee.totalWeightKg} / {tournee.truckMaxWeightKg} kg</span></span>
            <span>Volume chargé : <span className="text-slate-300 font-medium">{tournee.totalVolumeM3.toFixed(2)} / {tournee.truckMaxVolumeM3} m³</span></span>
            <span>Taux remplissage : <span className="text-slate-300 font-medium">{tournee.fillRatePercent.toFixed(1)}%</span></span>
          </div>
          <div className="space-y-2">
            {tournee.stops.map(stop => (
              <div key={stop.orderId}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/3">
                <div className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-400 text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {stop.sequence}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{stop.address}</p>
                  <p className="text-xs text-slate-500">
                    {stop.quantity}× {stop.vehicleModelLabel} — {stop.weightKg.toFixed(0)} kg
                  </p>
                </div>
                {stop.lat && (
                  <span className="text-xs text-slate-600 font-mono flex-shrink-0">
                    {stop.lat.toFixed(3)},{stop.lng?.toFixed(3)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default function OptimizationPage() {
  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [radius, setRadius] = useState(80)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(true)

  const { data: validatedTournees = [], isLoading: loadingOrders } = useQuery<Tournee[]>({
    queryKey: ['validated-orders-for-opt'],
    queryFn: () => getTourneesResponsable('PENDING_RESPONSABLE_VALIDATION'),
  })

  const mutation = useMutation({
    mutationFn: () => runOptimization(
      selectAll ? [] : selectedOrders,
      radius,
    ),
    onSuccess: (data) => {
      if (!data) return
      setResult(data)
      toast.success(data.message)
    },
    onError: () => toast.error('Erreur lors de l\'optimisation'),
  })

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Moteur d'optimisation" subtitle="Planification automatique des tournées" />
      <div className="flex-1 p-6 space-y-6">

        {/* Config panel */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">Paramètres d'optimisation</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Rayon de clustering : <span className="text-slate-200 font-medium">{radius} km</span>
              </label>
              <input type="range" min={20} max={200} step={10} value={radius}
                onChange={e => setRadius(+e.target.value)}
                className="w-full accent-brand-500" />
              <div className="flex justify-between text-xs text-slate-600 mt-0.5">
                <span>20 km</span><span>200 km</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Commandes à planifier</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={selectAll}
                  onChange={e => setSelectAll(e.target.checked)}
                  className="accent-brand-500" />
                <span className="text-sm text-slate-300">Toutes les commandes validées</span>
              </label>
            </div>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors disabled:opacity-50">
              <Zap className="w-4 h-4" />
              {mutation.isPending ? 'Optimisation...' : 'Lancer l\'optimisation'}
            </button>
          </div>
        </motion.div>

        {/* Loading */}
        {mutation.isPending && (
          <div className="flex flex-col items-center py-12 gap-3">
            <PageLoader />
            <p className="text-sm text-slate-400">Calcul en cours — clustering + bin packing + routage...</p>
          </div>
        )}

        {/* Results */}
        {result && !mutation.isPending && (
          <div className="space-y-5">
            {/* Summary */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Tournées proposées', value: result.proposedTournees.length, color: 'text-brand-400' },
                { label: 'Commandes planifiées', value: `${result.scheduledOrders}/${result.totalOrders}`, color: 'text-emerald-400' },
                { label: 'Taux remplissage moyen', value: `${result.averageFillRate}%`, color: 'text-amber-400' },
                { label: 'Non planifiées', value: result.unscheduledOrderIds.length, color: 'text-red-400' },
              ].map(s => (
                <div key={s.label} className="glass p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Non planifiées */}
            {result.unscheduledOrderIds.length > 0 && (
              <div className="glass p-4 flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-slate-400">
                  <span className="text-amber-400 font-medium">{result.unscheduledOrderIds.length} commande(s)</span> non planifiées — camions insuffisants ou véhicules trop grands.
                </p>
              </div>
            )}

            {/* Proposed tournées */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Tournées proposées
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/25">
                    {result.proposedTournees.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 ml-2">
                  Ces tournées sont des propositions — soumettez-les à l'opérateur pour confirmation.
                </p>
              </div>
              <div className="space-y-3">
                {result.proposedTournees.map((t, i) => (
                  <ProposedTourneeCard key={t.truckId} tournee={t} index={i} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Initial state */}
        {!result && !mutation.isPending && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-brand-400 opacity-60" />
            </div>
            <p className="text-slate-300 font-medium mb-1">Moteur d'optimisation prêt</p>
            <p className="text-sm text-slate-500 max-w-md">
              Configurez les paramètres puis lancez l'optimisation. L'algorithme utilise le bin packing FFD
              et le routage par plus proche voisin pour maximiser le taux de remplissage.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
