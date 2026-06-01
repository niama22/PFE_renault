import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Truck, Plus, Edit2, Power } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  getVehicleTypes, createVehicleType, updateVehicleType,
  deactivateVehicleType, activateVehicleType,
} from '@/api/admin.api'
// Cette page est accessible aussi par le RESPONSABLE (voir App.tsx)
import Header from '@/components/layout/Header'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { VehicleType } from '@/types'

const schema = z.object({
  name:          z.string().min(2, 'Requis'),
  description:   z.string().optional(),
  maxWeightKg:   z.coerce.number().positive('Doit être positif'),
  maxVolumeM3:   z.coerce.number().positive('Doit être positif'),
})
type VTForm = z.infer<typeof schema>

function VTModal({ vt, onClose }: { vt?: VehicleType; onClose: () => void }) {
  const qc = useQueryClient()
  const isEdit = !!vt

  const { register, handleSubmit, formState: { errors } } = useForm<VTForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: vt?.name ?? '',
      description: vt?.description ?? '',
      maxWeightKg: vt?.maxWeightKg ?? undefined,
      maxVolumeM3: vt?.maxVolumeM3 ?? undefined,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: VTForm) =>
      isEdit ? updateVehicleType(vt!.id, data) : createVehicleType(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Type mis à jour' : 'Type créé')
      qc.invalidateQueries({ queryKey: ['vehicle-types'] })
      onClose()
    },
    onError: () => toast.error('Erreur — le nom existe peut-être déjà'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass p-6 w-full max-w-md rounded-2xl shadow-2xl">
        <h2 className="text-slate-100 font-semibold text-base mb-5">
          {isEdit ? 'Modifier le type' : 'Nouveau type de véhicule'}
        </h2>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Nom</label>
            <input {...register('name')} className="input-dark w-full" placeholder="Ex: Camion 10T" />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Description</label>
            <textarea {...register('description')} rows={2} className="input-dark w-full resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Poids max (kg)</label>
              <input {...register('maxWeightKg')} type="number" step="0.1" className="input-dark w-full" />
              {errors.maxWeightKg && <p className="text-xs text-red-400 mt-1">{errors.maxWeightKg.message}</p>}
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Volume max (m³)</label>
              <input {...register('maxVolumeM3')} type="number" step="0.1" className="input-dark w-full" />
              {errors.maxVolumeM3 && <p className="text-xs text-red-400 mt-1">{errors.maxVolumeM3.message}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-navy-700 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-50">
              {mutation.isPending ? 'Chargement...' : (isEdit ? 'Enregistrer' : 'Créer')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function VehicleTypesPage() {
  const qc = useQueryClient()
  const [editVt, setEditVt] = useState<VehicleType | undefined>()
  const [showCreate, setShowCreate] = useState(false)
  const [confirmToggle, setConfirmToggle] = useState<VehicleType | null>(null)

  const { data: types = [], isLoading } = useQuery({
    queryKey: ['vehicle-types'],
    queryFn: getVehicleTypes,
  })

  const toggleMutation = useMutation({
    mutationFn: (vt: VehicleType) => vt.active ? deactivateVehicleType(vt.id) : activateVehicleType(vt.id),
    onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries({ queryKey: ['vehicle-types'] }); setConfirmToggle(null) },
    onError: () => toast.error('Erreur'),
  })

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Types de véhicules" subtitle="Catalogue des véhicules disponibles" />

      <div className="flex-1 p-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex justify-end">
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />
            Nouveau type
          </button>
        </motion.div>

        {isLoading ? <PageLoader /> : types.length === 0 ? (
          <EmptyState title="Aucun type de véhicule" description="Ajoutez votre premier type de véhicule." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map((vt, i) => (
              <motion.div key={vt.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-hover p-5 ${!vt.active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/15 border border-blue-500/25 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditVt(vt)}
                      className="p-1.5 rounded-lg hover:bg-brand-600/15 text-slate-500 hover:text-brand-400 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmToggle(vt)}
                      className="p-1.5 rounded-lg hover:bg-red-600/15 text-slate-500 hover:text-red-400 transition-colors">
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="text-slate-200 font-semibold text-sm mb-1">{vt.name}</h3>
                {vt.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{vt.description}</p>}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-navy-700/60 rounded-lg p-2.5">
                    <p className="text-xs text-slate-500 mb-0.5">Poids max</p>
                    <p className="text-sm font-bold text-slate-200">{(vt.maxWeightKg ?? 0).toLocaleString('fr-FR')} kg</p>
                  </div>
                  <div className="bg-navy-700/60 rounded-lg p-2.5">
                    <p className="text-xs text-slate-500 mb-0.5">Volume max</p>
                    <p className="text-sm font-bold text-slate-200">{vt.maxVolumeM3} m³</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${vt.active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <span className={`text-xs ${vt.active ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {vt.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {(showCreate || editVt) && (
        <VTModal vt={editVt} onClose={() => { setShowCreate(false); setEditVt(undefined) }} />
      )}

      <ConfirmDialog
        open={!!confirmToggle}
        onOpenChange={v => !v && setConfirmToggle(null)}
        title={confirmToggle?.active ? 'Désactiver le type' : 'Activer le type'}
        description={`Voulez-vous ${confirmToggle?.active ? 'désactiver' : 'activer'} "${confirmToggle?.name}" ?`}
        confirmLabel={confirmToggle?.active ? 'Désactiver' : 'Activer'}
        confirmVariant={confirmToggle?.active ? 'danger' : 'brand'}
        onConfirm={() => confirmToggle && toggleMutation.mutate(confirmToggle)}
        loading={toggleMutation.isPending}
      />
    </div>
  )
}
