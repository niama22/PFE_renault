import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Settings, Zap, MapPin, CalendarDays, Truck, Save, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getOptimizationConfig, saveOptimizationConfig } from '@/api/responsable.api'
import type { OptimizationConfig } from '@/api/responsable.api'
import Header from '@/components/layout/Header'
import { PageLoader } from '@/components/shared/LoadingSpinner'

function AlgoCard({ icon: Icon, title, desc, color }: {
  icon: React.ElementType; title: string; desc: string; color: string
}) {
  return (
    <div className="glass p-4 flex gap-3">
      <div className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-200">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

export default function OptimizationConfigPage() {
  const qc = useQueryClient()
  const { data: saved, isLoading } = useQuery<OptimizationConfig>({
    queryKey: ['optimization-config'],
    queryFn: getOptimizationConfig,
  })

  const [radius, setRadius]     = useState(80)
  const [window_, setWindow]    = useState(1)
  const [trucksOnly, setTrucksOnly] = useState(true)
  const [dirty, setDirty]       = useState(false)

  useEffect(() => {
    if (saved) {
      setRadius(saved.clusterRadiusKm)
      setWindow(saved.dateWindowDays)
      setTrucksOnly(saved.availableTrucksOnly)
      setDirty(false)
    }
  }, [saved])

  const mutation = useMutation({
    mutationFn: () => saveOptimizationConfig({
      clusterRadiusKm: radius,
      dateWindowDays: window_,
      availableTrucksOnly: trucksOnly,
    }),
    onSuccess: () => {
      toast.success('Configuration sauvegardée — l\'opérateur utilisera ces paramètres')
      qc.invalidateQueries({ queryKey: ['optimization-config'] })
      setDirty(false)
    },
    onError: () => toast.error('Erreur lors de la sauvegarde'),
  })

  if (isLoading) return <PageLoader />

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="Configuration du moteur d'optimisation"
        subtitle="Paramètres utilisés par l'opérateur pour la planification automatique"
      />
      <div className="flex-1 p-6 space-y-6">

        {/* Paramètres */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="glass p-6 space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-semibold text-slate-200">Paramètres de planification</h3>
            {dirty && (
              <span className="ml-auto text-xs text-amber-400 flex items-center gap-1">
                <Info className="w-3 h-3" /> Modifications non sauvegardées
              </span>
            )}
          </div>

          {/* Rayon de clustering */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-3.5 h-3.5 text-brand-400" />
              <label className="text-sm text-slate-300 font-medium">
                Rayon de clustering géographique
                <span className="ml-2 text-brand-400 font-bold">{radius} km</span>
              </label>
            </div>
            <input type="range" min={20} max={300} step={10} value={radius}
              onChange={e => { setRadius(+e.target.value); setDirty(true) }}
              className="w-full accent-brand-500" />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>20 km — livraisons très locales</span>
              <span>300 km — tournées régionales</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Les commandes dans un rayon de <strong className="text-slate-300">{radius} km</strong> sont
              regroupées dans la même tournée. Augmenter pour des tournées plus longues avec plus d'arrêts.
            </p>
          </div>

          {/* Fenêtre de date */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
              <label className="text-sm text-slate-300 font-medium">
                Fenêtre de regroupement par date
                <span className="ml-2 text-emerald-400 font-bold">±{window_} jour{window_ > 1 ? 's' : ''}</span>
              </label>
            </div>
            <input type="range" min={0} max={7} step={1} value={window_}
              onChange={e => { setWindow(+e.target.value); setDirty(true) }}
              className="w-full accent-emerald-500" />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>0 — même jour uniquement</span>
              <span>7 — semaine entière</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Les commandes dont les dates de livraison sont à moins de{' '}
              <strong className="text-slate-300">{window_} jour{window_ > 1 ? 's' : ''}</strong> d'écart
              peuvent être groupées dans la même tournée.
            </p>
          </div>

          {/* Camions disponibles seulement */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-3.5 h-3.5 text-amber-400" />
              <label className="text-sm text-slate-300 font-medium">Sélection des camions</label>
            </div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-10 h-5 rounded-full transition-colors relative ${trucksOnly ? 'bg-brand-500' : 'bg-white/10'}`}
                onClick={() => { setTrucksOnly(v => !v); setDirty(true) }}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${trucksOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                {trucksOnly
                  ? 'Uniquement les camions disponibles (statut AVAILABLE)'
                  : 'Tous les camions (y compris en service ou maintenance)'}
              </span>
            </label>
          </div>

          {/* Bouton save */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !dirty}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors disabled:opacity-40">
              <Save className="w-4 h-4" />
              {mutation.isPending ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
            </button>
          </div>
        </motion.div>

        {/* Description de l'algorithme */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">Algorithme utilisé</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <AlgoCard
              icon={CalendarDays}
              color="bg-emerald-500/10 text-emerald-400"
              title="1. Clustering temporel"
              desc="Regroupe les commandes par fenêtre de date de livraison avant tout autre traitement."
            />
            <AlgoCard
              icon={MapPin}
              color="bg-blue-500/10 text-blue-400"
              title="2. Clustering géographique"
              desc="Dans chaque groupe date, regroupe les adresses proches (algorithme greedy par rayon)."
            />
            <AlgoCard
              icon={Truck}
              color="bg-amber-500/10 text-amber-400"
              title="3. Bin packing FFD"
              desc="Assigne les véhicules aux camions en vérifiant poids, volume ET dimensions physiques (hauteur, orientation)."
            />
            <AlgoCard
              icon={Zap}
              color="bg-purple-500/10 text-purple-400"
              title="4. Clarke-Wright Savings"
              desc="Optimise l'ordre des livraisons dans chaque tournée en maximisant les économies de distance."
            />
            <AlgoCard
              icon={Info}
              color="bg-slate-500/10 text-slate-400"
              title="Résultat"
              desc="Tournées proposées à l'opérateur — non confirmées. L'opérateur soumet au responsable pour validation finale."
            />
          </div>
        </motion.div>

      </div>
    </div>
  )
}
