import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Car, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  getVehicleModels, createVehicleModel, updateVehicleModel,
  toggleVehicleModel, deleteVehicleModel,
} from '@/api/responsable.api'
import Header from '@/components/layout/Header'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { VehicleModel } from '@/types'

type FormData = {
  brand: string; model: string
  lengthCm: number; widthCm: number; heightCm: number
  weightKg: number; description: string
}

function ModelForm({ initial, onSubmit, onClose, loading }: {
  initial?: Partial<FormData>; onSubmit: (d: FormData) => void
  onClose: () => void; loading: boolean
}) {
  const { register, handleSubmit } = useForm<FormData>({ defaultValues: initial ?? {} })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass p-6 w-full max-w-md rounded-2xl shadow-2xl">
        <h2 className="text-slate-100 font-semibold mb-5">
          {initial ? 'Modifier le modèle' : 'Nouveau modèle de véhicule'}
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Marque *</label>
              <input {...register('brand', { required: true })} className="input-dark w-full" placeholder="Renault" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Modèle *</label>
              <input {...register('model', { required: true })} className="input-dark w-full" placeholder="Clio" />
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Dimensions du véhicule (cm)</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Longueur</label>
              <input type="number" {...register('lengthCm', { required: true, valueAsNumber: true })} className="input-dark w-full" placeholder="405" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Largeur</label>
              <input type="number" {...register('widthCm', { required: true, valueAsNumber: true })} className="input-dark w-full" placeholder="175" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Hauteur</label>
              <input type="number" {...register('heightCm', { required: true, valueAsNumber: true })} className="input-dark w-full" placeholder="145" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Poids (kg) *</label>
            <input type="number" {...register('weightKg', { required: true, valueAsNumber: true })} className="input-dark w-full" placeholder="1200" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Description</label>
            <input {...register('description')} className="input-dark w-full" placeholder="Optionnel..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-50">
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function VehicleModelsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<VehicleModel | null | 'new'>(null)
  const [deleteTarget, setDeleteTarget] = useState<VehicleModel | null>(null)

  const { data: models = [], isLoading } = useQuery<VehicleModel[]>({
    queryKey: ['vehicle-models'],
    queryFn: getVehicleModels,
  })

  const createMut = useMutation({
    mutationFn: (d: FormData) => createVehicleModel(d as any),
    onSuccess: () => { toast.success('Modèle créé'); qc.invalidateQueries({ queryKey: ['vehicle-models'] }); setModal(null) },
    onError: () => toast.error('Ce modèle existe déjà'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => updateVehicleModel(id, data as any),
    onSuccess: () => { toast.success('Modèle mis à jour'); qc.invalidateQueries({ queryKey: ['vehicle-models'] }); setModal(null) },
    onError: () => toast.error('Erreur'),
  })
  const toggleMut = useMutation({
    mutationFn: (id: string) => toggleVehicleModel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-models'] }),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteVehicleModel(id),
    onSuccess: () => { toast.success('Modèle supprimé'); qc.invalidateQueries({ queryKey: ['vehicle-models'] }); setDeleteTarget(null) },
  })

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Modèles de véhicules" subtitle="Catalogue des véhicules transportables" />
      <div className="flex-1 p-6 space-y-5">

        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-400">
            {models.filter(m => m.active).length} actif(s) / {models.length} total
          </p>
          <button onClick={() => setModal('new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Nouveau modèle
          </button>
        </div>

        {isLoading ? <PageLoader /> : models.length === 0 ? (
          <EmptyState title="Aucun modèle" description="Ajoutez les modèles de véhicules que les clients peuvent commander." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {models.map((m, i) => (
              <motion.div key={m.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`glass-hover p-5 ${!m.active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Car className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{m.brand} {m.model}</p>
                      <p className="text-xs text-slate-500">{m.description || 'Voiture particulière'}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    m.active
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                      : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                  }`}>
                    {m.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-500 mb-4">
                  <span>Dimensions : <span className="text-slate-300">{m.lengthCm}×{m.widthCm}×{m.heightCm} cm</span></span>
                  <span>Poids : <span className="text-slate-300">{m.weightKg.toLocaleString('fr-FR')} kg</span></span>
                  <span>Volume : <span className="text-slate-300">
                    {((m.lengthCm * m.widthCm * m.heightCm) / 1_000_000).toFixed(2)} m³
                  </span></span>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => toggleMut.mutate(m.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
                    {m.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {m.active ? 'Désactiver' : 'Activer'}
                  </button>
                  <button onClick={() => setModal(m)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Modifier
                  </button>
                  <button onClick={() => setDeleteTarget(m)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-red-600/10 hover:bg-red-600/20 text-red-400 transition-colors ml-auto">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <ModelForm
          initial={modal === 'new' ? undefined : modal as any}
          onSubmit={d => modal === 'new'
            ? createMut.mutate(d as any)
            : updateMut.mutate({ id: (modal as VehicleModel).id, data: d as any })}
          onClose={() => setModal(null)}
          loading={createMut.isPending || updateMut.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={v => !v && setDeleteTarget(null)}
        title="Supprimer le modèle"
        description={`Supprimer "${deleteTarget?.brand} ${deleteTarget?.model}" ?`}
        confirmLabel="Supprimer"
        confirmVariant="danger"
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        loading={deleteMut.isPending}
      />
    </div>
  )
}
