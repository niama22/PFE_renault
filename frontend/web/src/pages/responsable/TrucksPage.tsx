import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Truck as TruckIcon, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, User } from 'lucide-react'
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import {
  getTrucks, createTruck, updateTruck, updateTruckStatus, deleteTruck,
} from '@/api/responsable.api'
import { getUsersByRole } from '@/api/admin.api'
import Header from '@/components/layout/Header'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import EmptyState from '@/components/shared/EmptyState'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { Truck, TruckStatus, KeycloakUser } from '@/types'

const STATUS_COLORS: Record<TruckStatus, string> = {
  AVAILABLE:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  IN_USE:      'bg-blue-500/15 text-blue-400 border-blue-500/25',
  MAINTENANCE: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
}
const STATUS_LABELS: Record<TruckStatus, string> = {
  AVAILABLE: 'Disponible', IN_USE: 'En service', MAINTENANCE: 'Maintenance',
}

type FormData = {
  plateNumber: string
  brand: string
  model: string
  maxWeightKg: number
  maxVolumeM3: number
  internalLengthCm: number
  internalWidthCm: number
  internalHeightCm: number
  chauffeurId: string
  chauffeurName: string
  notes: string
}

function TruckForm({ initial, onSubmit, onClose, loading }: {
  initial?: Partial<FormData>
  onSubmit: (d: FormData) => void
  onClose: () => void
  loading: boolean
}) {
  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      plateNumber: initial?.plateNumber ?? '',
      brand: initial?.brand ?? '',
      model: initial?.model ?? '',
      maxWeightKg: initial?.maxWeightKg ?? 0,
      maxVolumeM3: initial?.maxVolumeM3 ?? 0,
      internalLengthCm: initial?.internalLengthCm ?? 0,
      internalWidthCm: initial?.internalWidthCm ?? 0,
      internalHeightCm: initial?.internalHeightCm ?? 0,
      chauffeurId: initial?.chauffeurId ?? '',
      chauffeurName: initial?.chauffeurName ?? '',
      notes: initial?.notes ?? '',
    },
  })

  const { data: chauffeurs = [] } = useQuery<KeycloakUser[]>({
    queryKey: ['users-by-role', 'chauffeur'],
    queryFn: () => getUsersByRole('chauffeur'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass p-6 w-full max-w-lg rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        <h2 className="text-slate-100 font-semibold mb-5">
          {initial?.plateNumber ? 'Modifier le camion' : 'Ajouter un camion'}
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Immatriculation *</label>
              <input {...register('plateNumber', { required: true })} className="input-dark w-full" placeholder="AA-123-BB" />
              {errors.plateNumber && <p className="text-xs text-red-400 mt-1">Obligatoire</p>}
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Marque *</label>
              <input {...register('brand', { required: true })} className="input-dark w-full" placeholder="Renault" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Modèle *</label>
              <input {...register('model', { required: true })} className="input-dark w-full" placeholder="Master" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Poids max (kg) *</label>
              <input type="number" {...register('maxWeightKg', { required: true, valueAsNumber: true })} className="input-dark w-full" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Volume max (m³) *</label>
              <input type="number" step="0.1" {...register('maxVolumeM3', { required: true, valueAsNumber: true })} className="input-dark w-full" />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Chauffeur assigné *</label>
            <Controller
              name="chauffeurId"
              control={control}
              rules={{ required: 'Chauffeur obligatoire' }}
              render={({ field }) => (
                <select
                  className="input-dark w-full"
                  value={field.value}
                  onChange={e => {
                    field.onChange(e.target.value)
                    const found = chauffeurs.find(c => c.id === e.target.value)
                    setValue('chauffeurName',
                      found ? (`${found.firstName ?? ''} ${found.lastName ?? ''}`).trim() || found.username : '')
                  }}
                >
                  <option value="">— Sélectionner un chauffeur —</option>
                  {chauffeurs.map(c => (
                    <option key={c.id} value={c.id}>
                      {(`${c.firstName ?? ''} ${c.lastName ?? ''}`).trim() || c.username}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.chauffeurId && <p className="text-xs text-red-400 mt-1">{errors.chauffeurId.message}</p>}
          </div>

          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide pt-1">Dimensions intérieures (cm)</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Longueur</label>
              <input type="number" {...register('internalLengthCm', { required: true, valueAsNumber: true })} className="input-dark w-full" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Largeur</label>
              <input type="number" {...register('internalWidthCm', { required: true, valueAsNumber: true })} className="input-dark w-full" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Hauteur</label>
              <input type="number" {...register('internalHeightCm', { required: true, valueAsNumber: true })} className="input-dark w-full" />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notes</label>
            <input {...register('notes')} className="input-dark w-full" placeholder="Optionnel..." />
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

export default function TrucksPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<Truck | null | 'new'>(null)
  const [deleteTarget, setDeleteTarget] = useState<Truck | null>(null)

  const { data: trucks = [], isLoading } = useQuery<Truck[]>({
    queryKey: ['trucks'],
    queryFn: getTrucks,
  })

  const createMut = useMutation({
    mutationFn: (d: FormData) => createTruck(d as any),
    onSuccess: () => { toast.success('Camion ajouté'); qc.invalidateQueries({ queryKey: ['trucks'] }); setModal(null) },
    onError: () => toast.error('Erreur lors de l\'ajout'),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => updateTruck(id, data as any),
    onSuccess: () => { toast.success('Camion mis à jour'); qc.invalidateQueries({ queryKey: ['trucks'] }); setModal(null) },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TruckStatus }) => updateTruckStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trucks'] }),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTruck(id),
    onSuccess: () => { toast.success('Camion supprimé'); qc.invalidateQueries({ queryKey: ['trucks'] }); setDeleteTarget(null) },
    onError: () => toast.error('Impossible de supprimer ce camion'),
  })

  const NEXT_STATUS: Partial<Record<TruckStatus, TruckStatus>> = {
    AVAILABLE: 'IN_USE', IN_USE: 'AVAILABLE', MAINTENANCE: 'AVAILABLE',
  }

  // Build isolated copy of the truck to avoid form mutating query cache
  const modalInitial = modal === 'new' || modal === null ? undefined : {
    plateNumber: modal.plateNumber,
    brand: modal.brand,
    model: modal.model,
    maxWeightKg: modal.maxWeightKg,
    maxVolumeM3: modal.maxVolumeM3,
    internalLengthCm: modal.internalLengthCm,
    internalWidthCm: modal.internalWidthCm,
    internalHeightCm: modal.internalHeightCm,
    chauffeurId: modal.chauffeurId ?? '',
    chauffeurName: modal.chauffeurName ?? '',
    notes: modal.notes ?? '',
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Flotte de camions" subtitle="Gestion des véhicules de transport" />
      <div className="flex-1 p-6 space-y-5">

        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-400">{trucks.length} camion(s) enregistré(s)</p>
          <button onClick={() => setModal('new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Ajouter un camion
          </button>
        </div>

        {isLoading ? <PageLoader /> : trucks.length === 0 ? (
          <EmptyState title="Aucun camion" description="Ajoutez votre premier camion pour commencer." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {trucks.map((t, i) => (
              <motion.div key={t.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-hover p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                      <TruckIcon className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{t.brand} {t.model}</p>
                      <p className="text-xs text-slate-500 font-mono">{t.plateNumber}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                  <span>Poids max : <span className="text-slate-300">{t.maxWeightKg.toLocaleString('fr-FR')} kg</span></span>
                  <span>Volume max : <span className="text-slate-300">{t.maxVolumeM3} m³</span></span>
                  <span>Caisse : <span className="text-slate-300">{t.internalLengthCm}×{t.internalWidthCm}×{t.internalHeightCm} cm</span></span>
                  {t.notes && <span className="col-span-2 italic text-slate-600">{t.notes}</span>}
                </div>

                <div className="flex items-center gap-1.5 text-xs mb-3 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <User className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  {t.chauffeurName
                    ? <span className="text-slate-300 font-medium">{t.chauffeurName}</span>
                    : <span className="text-red-400 italic">Aucun chauffeur assigné</span>
                  }
                </div>

                <div className="flex gap-2">
                  <button onClick={() => {
                    const next = NEXT_STATUS[t.status]
                    if (next) statusMut.mutate({ id: t.id, status: next })
                  }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
                    {t.status === 'AVAILABLE' ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    {t.status === 'AVAILABLE' ? 'En service' : 'Disponible'}
                  </button>
                  <button onClick={() => setModal(t)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Modifier
                  </button>
                  <button onClick={() => setDeleteTarget(t)}
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
        <TruckForm
          key={modal === 'new' ? 'new' : (modal as Truck).id}
          initial={modalInitial}
          onSubmit={d => modal === 'new'
            ? createMut.mutate(d)
            : updateMut.mutate({ id: (modal as Truck).id, data: d })}
          onClose={() => setModal(null)}
          loading={createMut.isPending || updateMut.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={v => !v && setDeleteTarget(null)}
        title="Supprimer le camion"
        description={`Supprimer "${deleteTarget?.brand} ${deleteTarget?.model} (${deleteTarget?.plateNumber})" ?`}
        confirmLabel="Supprimer"
        confirmVariant="danger"
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        loading={deleteMut.isPending}
      />
    </div>
  )
}
