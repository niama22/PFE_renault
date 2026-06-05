import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Package, Plus, MapPin, UserCircle, Trash2,
  Upload, Download, FileSpreadsheet, CheckCircle2, XCircle,
  Clock, History, RefreshCw, Eye, EyeOff, Ban, Calendar, ChevronDown, ChevronUp,
} from 'lucide-react'
import Pagination from '@/components/shared/Pagination'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { NavLink } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { getMyOrders, createOrder, requestOrderCancellation } from '@/api/client.api'
import { getActiveVehicleModels } from '@/api/responsable.api'
import { useProfileStore } from '@/store/profile.store'
import { useAuthStore } from '@/store/auth.store'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatDateTime } from '@/lib/utils'
import type { VehicleModel, ChassisItem } from '@/types'

const PAGE_SIZE = 4

function formatAddress(addr: any): string {
  if (!addr) return '—'
  if (typeof addr === 'string') return addr
  return [addr.street, addr.city, addr.zip ?? addr.postalCode, addr.country].filter(Boolean).join(', ')
}

function extractCity(addr: any): string {
  if (!addr) return ''
  if (typeof addr === 'object') return addr.city ?? ''
  return (addr as string).split(',')[1]?.trim() ?? ''
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const vehicleRowSchema = z.object({
  vehicleModelId: z.string().min(1, 'Choisir un modèle'),
  quantity: z.coerce.number().int().min(1, 'Min 1').max(50, 'Max 50'),
})

const orderSchema = z.object({
  street:                z.string().min(3, 'Requis'),
  city:                  z.string().min(2, 'Requis'),
  postalCode:            z.string().min(4, 'Requis'),
  country:               z.string().min(2, 'Requis'),
  vehicles:              z.array(vehicleRowSchema).min(1, 'Au moins un véhicule'),
  requestedDeliveryDate: z.string().min(1, 'Requis'),
})
type OrderForm = z.infer<typeof orderSchema>

// ── Excel template download ───────────────────────────────────────────────────

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Modèle', 'Quantité', 'Date livraison', 'Rue', 'Ville', 'Code postal', 'Pays'],
    ['Dacia Sandero', 3, '2026-06-15', '123 Avenue Hassan II', 'Rabat', '10000', 'Maroc'],
    ['Renault Clio',  2, '2026-06-15', '123 Avenue Hassan II', 'Rabat', '10000', 'Maroc'],
    ['Dacia Duster',  1, '2026-06-20', '45 Rue Mohammed V',    'Casablanca', '20000', 'Maroc'],
  ])
  ws['!cols'] = [18, 10, 14, 25, 15, 12, 10].map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Commandes')
  XLSX.writeFile(wb, 'template_commandes_optiflow.xlsx')
}

// ── Excel import modal ────────────────────────────────────────────────────────

function ImportModal({ vehicleModels, onClose }: { vehicleModels: VehicleModel[]; onClose: () => void }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { profile } = useProfileStore()
  const [rows, setRows] = useState<any[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)

  const modelMap: Record<string, VehicleModel> = {}
  for (const m of vehicleModels) {
    modelMap[`${m.brand} ${m.model}`.toLowerCase()] = m
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target!.result, { type: 'binary', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        const parseErrors: string[] = []
        const parsed: any[] = []

        for (let i = 1; i < data.length; i++) {
          const [modelLabel, qty, date, street, city, postalCode, country] = data[i]
          if (!modelLabel && !qty) continue

          const label = String(modelLabel).trim()
          const vm = modelMap[label.toLowerCase()]
          if (!vm) { parseErrors.push(`Ligne ${i + 1} : modèle "${label}" introuvable`); continue }

          const quantity = parseInt(String(qty))
          if (isNaN(quantity) || quantity < 1) { parseErrors.push(`Ligne ${i + 1} : quantité invalide`); continue }

          let deliveryDate = ''
          if (date instanceof Date) {
            deliveryDate = date.toISOString().split('T')[0]
          } else {
            deliveryDate = String(date).trim()
          }
          if (!deliveryDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            parseErrors.push(`Ligne ${i + 1} : date invalide (format attendu : AAAA-MM-JJ)`); continue
          }

          parsed.push({
            vehicleModelId: vm.id,
            vehicleModelLabel: `${vm.brand} ${vm.model}`,
            quantity,
            deliveryDate,
            street: String(street || profile?.address?.street || '').trim(),
            city: String(city || profile?.address?.city || '').trim(),
            postalCode: String(postalCode || profile?.address?.postalCode || '').trim(),
            country: String(country || profile?.address?.country || 'Maroc').trim(),
          })
        }

        setErrors(parseErrors)
        setRows(parsed)
      } catch {
        setErrors(['Impossible de lire le fichier. Vérifiez le format.'])
      }
    }
    reader.readAsBinaryString(file)
  }

  async function handleImport() {
    if (rows.length === 0) return
    setImporting(true)

    // Group by date + address
    const groups: Record<string, typeof rows> = {}
    for (const row of rows) {
      const key = `${row.deliveryDate}|${row.street}|${row.city}`
      if (!groups[key]) groups[key] = []
      groups[key].push(row)
    }

    let created = 0
    for (const group of Object.values(groups)) {
      try {
        await createOrder({
          vehicles: group.map(r => ({
            vehicleModelId: r.vehicleModelId,
            vehicleModelLabel: r.vehicleModelLabel,
            quantity: r.quantity,
          })),
          requestedDeliveryDate: group[0].deliveryDate,
          deliveryAddress: {
            street: group[0].street,
            city: group[0].city,
            postalCode: group[0].postalCode,
            country: group[0].country,
          },
        })
        created++
      } catch {
        setErrors(e => [...e, `Erreur lors de la création d'une commande`])
      }
    }

    setImporting(false)
    setDone(true)
    toast.success(`${created} commande(s) créée(s) depuis Excel`)
    qc.invalidateQueries({ queryKey: ['client-orders', user?.keycloakId] })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass w-full max-w-lg rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] p-6">

        <div className="flex items-center gap-3 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          <h2 className="text-slate-100 font-semibold text-base">Importer depuis Excel</h2>
        </div>

        {/* Format info */}
        <div className="bg-navy-800/60 rounded-xl p-3 mb-4 text-xs text-slate-400 space-y-1">
          <p className="font-medium text-slate-300 mb-1">Format attendu (colonnes) :</p>
          <div className="grid grid-cols-7 gap-1 text-[10px]">
            {['Modèle', 'Quantité', 'Date livraison', 'Rue', 'Ville', 'Code postal', 'Pays'].map(h => (
              <span key={h} className="bg-navy-700 px-1.5 py-0.5 rounded text-slate-400 text-center truncate">{h}</span>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">
            Les lignes avec la même date + adresse sont regroupées en une seule commande.
          </p>
        </div>

        <button onClick={downloadTemplate}
          className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 mb-4 transition-colors">
          <Download className="w-3.5 h-3.5" />
          Télécharger le modèle Excel
        </button>

        {/* File picker */}
        {!done && (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-navy-600 hover:border-brand-500/50 rounded-xl p-6 cursor-pointer transition-colors mb-4">
            <Upload className="w-6 h-6 text-slate-500 mb-2" />
            <span className="text-sm text-slate-400">Cliquez ou glissez un fichier .xlsx</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
          </label>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-3 space-y-1">
            {errors.map((e, i) => (
              <p key={i} className="text-xs text-red-400 flex items-center gap-1.5">
                <XCircle className="w-3 h-3 flex-shrink-0" /> {e}
              </p>
            ))}
          </div>
        )}

        {/* Preview rows */}
        {rows.length > 0 && !done && (
          <div className="mb-4">
            <p className="text-xs text-slate-400 mb-2">{rows.length} ligne(s) lues — aperçu :</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {rows.slice(0, 8).map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-300 bg-navy-800/40 px-2 py-1 rounded">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  <span>{r.vehicleModelLabel} × {r.quantity}</span>
                  <span className="text-slate-500">→ {r.city} · {r.deliveryDate}</span>
                </div>
              ))}
              {rows.length > 8 && <p className="text-xs text-slate-500 px-2">+{rows.length - 8} autre(s)…</p>}
            </div>
          </div>
        )}

        {done && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm mb-4">
            <CheckCircle2 className="w-4 h-4" />
            Import terminé avec succès.
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-navy-700 transition-colors">
            {done ? 'Fermer' : 'Annuler'}
          </button>
          {!done && (
            <button onClick={handleImport}
              disabled={rows.length === 0 || importing}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50">
              {importing ? 'Import en cours…' : `Importer (${rows.length} lignes)`}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Create order modal ────────────────────────────────────────────────────────

function CreateOrderModal({ vehicleModels, onClose }: { vehicleModels: VehicleModel[]; onClose: () => void }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { profile } = useProfileStore()
  const hasProfileAddress = !!(profile?.address?.street)

  const { register, handleSubmit, control, formState: { errors } } = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      street:     profile?.address?.street     ?? '',
      city:       profile?.address?.city       ?? '',
      postalCode: profile?.address?.postalCode ?? '',
      country:    profile?.address?.country    ?? 'Maroc',
      vehicles:   [{ vehicleModelId: '', quantity: 1 }],
      requestedDeliveryDate: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })(),
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'vehicles' })
  const modelMap = Object.fromEntries(vehicleModels.map(m => [m.id, m]))

  const mutation = useMutation({
    mutationFn: (data: OrderForm) => createOrder({
      vehicles: data.vehicles.map(v => ({
        vehicleModelId:    v.vehicleModelId,
        vehicleModelLabel: modelMap[v.vehicleModelId]
          ? `${modelMap[v.vehicleModelId].brand} ${modelMap[v.vehicleModelId].model}`
          : undefined,
        quantity: v.quantity,
      })),
      requestedDeliveryDate: data.requestedDeliveryDate,
      deliveryAddress: { street: data.street, city: data.city, postalCode: data.postalCode, country: data.country },
    }),
    onSuccess: () => {
      toast.success('Commande créée — en attente de validation opérateur')
      qc.invalidateQueries({ queryKey: ['client-orders', user?.keycloakId] })
      onClose()
    },
    onError: () => toast.error('Erreur lors de la création'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass w-full max-w-xl rounded-2xl shadow-2xl overflow-y-auto max-h-[92vh] p-6">

        <h2 className="text-slate-100 font-semibold text-base mb-1">Nouvelle commande</h2>
        <p className="text-xs text-slate-500 mb-5">
          Sélectionnez le modèle et la quantité. Les IDs châssis seront générés automatiquement.
        </p>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
          {/* Adresse */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Adresse de livraison</p>
              {hasProfileAddress && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Profil pré-rempli
                </span>
              )}
            </div>
            {!hasProfileAddress && (
              <p className="text-xs text-amber-400/80 flex items-center gap-1.5 mb-2">
                <UserCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <NavLink to="/client/profile" className="underline underline-offset-2 hover:text-amber-300" onClick={onClose}>
                  Enregistrez votre adresse dans votre profil
                </NavLink>{' '}pour ne plus la saisir.
              </p>
            )}
            <div className="space-y-2">
              <div>
                <input {...register('street')} className="input-dark w-full" placeholder="Rue et numéro" />
                {errors.street && <p className="text-xs text-red-400 mt-1">{errors.street.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input {...register('city')} className="input-dark w-full" placeholder="Ville" />
                  {errors.city && <p className="text-xs text-red-400 mt-1">{errors.city.message}</p>}
                </div>
                <div>
                  <input {...register('postalCode')} className="input-dark w-full" placeholder="Code postal" />
                  {errors.postalCode && <p className="text-xs text-red-400 mt-1">{errors.postalCode.message}</p>}
                </div>
              </div>
              <input {...register('country')} className="input-dark w-full" placeholder="Pays" />
            </div>
          </div>

          {/* Véhicules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Véhicules</p>
              <button type="button" onClick={() => append({ vehicleModelId: '', quantity: 1 })}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors">
                <Plus className="w-3 h-3" /> Ajouter un modèle
              </button>
            </div>
            <div className="grid grid-cols-[1fr_5rem_2rem] gap-2 mb-1 px-1">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">Modèle</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">Quantité</p>
              <span />
            </div>
            {vehicleModels.length === 0 ? (
              <p className="text-xs text-amber-400 py-2">Aucun modèle disponible — contactez le responsable.</p>
            ) : (
              <div className="space-y-2">
                {fields.map((field, idx) => (
                  <div key={field.id} className="grid grid-cols-[1fr_5rem_2rem] gap-2 items-start">
                    <div>
                      <Controller control={control} name={`vehicles.${idx}.vehicleModelId`}
                        render={({ field: f }) => (
                          <select {...f} className="input-dark w-full">
                            <option value="">Choisir…</option>
                            {vehicleModels.map(vm => (
                              <option key={vm.id} value={vm.id}>{vm.brand} {vm.model}</option>
                            ))}
                          </select>
                        )}
                      />
                      {errors.vehicles?.[idx]?.vehicleModelId && (
                        <p className="text-xs text-red-400 mt-1">{errors.vehicles[idx]!.vehicleModelId!.message}</p>
                      )}
                    </div>
                    <div>
                      <input {...register(`vehicles.${idx}.quantity`)} type="number" min={1} max={50}
                        className="input-dark w-full text-center" placeholder="1" />
                      {errors.vehicles?.[idx]?.quantity && (
                        <p className="text-xs text-red-400 mt-1">{errors.vehicles[idx]!.quantity!.message}</p>
                      )}
                    </div>
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(idx)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors mt-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Date de livraison souhaitée</label>
            <input {...register('requestedDeliveryDate')} type="date" className="input-dark w-full"
              min={new Date().toISOString().split('T')[0]} style={{ colorScheme: 'dark' }} />
            {errors.requestedDeliveryDate && (
              <p className="text-xs text-red-400 mt-1">{errors.requestedDeliveryDate.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-navy-700 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={mutation.isPending || vehicleModels.length === 0}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white transition-colors disabled:opacity-50">
              {mutation.isPending ? 'Envoi...' : 'Commander'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Chassis masking ────────────────────────────────────────────────────────────

function maskChassis(id: string): string {
  if (!id || id.length <= 4) return id
  return id.substring(0, 2) + '•••' + id.substring(id.length - 2)
}

// ── Cancel modal ──────────────────────────────────────────────────────────────

const CANCEL_STATUSES = ['PENDING_VALIDATION', 'VALIDATED', 'PLANNED']

function CancelOrderModal({ order, onClose }: { order: any; onClose: () => void }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const vehicles: ChassisItem[] = order.vehicles ?? []
  const [reason, setReason] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [partialMode, setPartialMode] = useState(false)

  const mutation = useMutation({
    mutationFn: () => requestOrderCancellation(
      order.id,
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

  function toggleVehicle(chassisId: string) {
    setSelectedIds(prev =>
      prev.includes(chassisId) ? prev.filter(id => id !== chassisId) : [...prev, chassisId]
    )
  }

  const canSubmit = reason.trim().length >= 5 && (!partialMode || selectedIds.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass p-6 w-full max-w-lg rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">

        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center">
            <Ban className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h2 className="text-slate-100 font-semibold text-base">Demande d'annulation</h2>
            <p className="text-xs text-slate-500">
              {order.orderNumber ?? `#${order.id?.substring(0, 8)}`}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Mode : total ou partiel */}
          {vehicles.length > 1 && (
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2 block">
                Périmètre d'annulation
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setPartialMode(false); setSelectedIds([]) }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                    !partialMode ? 'bg-red-600/20 border-red-500/50 text-red-300' : 'bg-navy-800/40 border-navy-600/40 text-slate-400 hover:border-red-500/30'
                  }`}>
                  Commande entière ({vehicles.length} véhicules)
                </button>
                <button
                  onClick={() => setPartialMode(true)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                    partialMode ? 'bg-red-600/20 border-red-500/50 text-red-300' : 'bg-navy-800/40 border-navy-600/40 text-slate-400 hover:border-red-500/30'
                  }`}>
                  Sélection partielle
                </button>
              </div>
            </div>
          )}

          {/* Vehicle selection */}
          {partialMode && (
            <div>
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2 block">
                Véhicules à annuler <span className="text-red-400">*</span>
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {vehicles.map((v: any) => (
                  <label key={v.chassisId}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                      selectedIds.includes(v.chassisId)
                        ? 'bg-red-600/10 border-red-500/30'
                        : 'bg-navy-800/40 border-navy-600/30 hover:border-navy-500/50'
                    }`}>
                    <input type="checkbox"
                      checked={selectedIds.includes(v.chassisId)}
                      onChange={() => toggleVehicle(v.chassisId)}
                      className="w-3.5 h-3.5 accent-red-500" />
                    <span className="font-mono text-xs text-slate-300">{maskChassis(v.chassisId)}</span>
                    <span className="text-xs text-slate-500 ml-auto">{v.vehicleModelLabel ?? '—'}</span>
                  </label>
                ))}
              </div>
              {partialMode && selectedIds.length === 0 && (
                <p className="text-xs text-red-400 mt-1">Sélectionnez au moins un véhicule</p>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1.5 block">
              Motif d'annulation <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="input-dark w-full resize-none"
              placeholder="Précisez la raison de votre demande d'annulation (minimum 5 caractères)…"
            />
            {reason.length > 0 && reason.trim().length < 5 && (
              <p className="text-xs text-red-400 mt-1">Motif trop court (min. 5 caractères)</p>
            )}
          </div>

          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300">
            La demande sera transmise à l'opérateur puis validée par le responsable.
            Vous serez notifié du résultat.
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-navy-700/50">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
            Fermer
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50">
            {mutation.isPending ? 'Envoi…' : 'Envoyer la demande'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Order detail modal ────────────────────────────────────────────────────────

function OrderDetailModal({ order, onClose, onCancel }: { order: any; onClose: () => void; onCancel: () => void }) {
  const [showChassis, setShowChassis] = useState(false)
  const vehicles: ChassisItem[] = order.vehicles ?? []
  const canCancel = CANCEL_STATUSES.includes(order.status)

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between items-start py-2 border-b border-white/10 last:border-0">
      <span className="text-white/60 text-xs font-medium w-40 flex-shrink-0">{label}</span>
      <span className="text-white text-sm font-semibold text-right">{value}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-xl rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <p className="text-white font-bold text-lg">{order.orderNumber ?? `#${order.id?.substring(0, 8)}`}</p>
            <p className="text-white/50 text-xs mt-0.5">{formatDateTime(order.createdAt)}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="p-5 space-y-4">
          {/* Infos principales */}
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 16px' }}>
            <Row label="Numéro commande"     value={order.orderNumber ?? '—'} />
            <Row label="Date livraison"       value={order.requestedDeliveryDate?.split('T')[0] ?? '—'} />
            <Row label="Arrivée estimée"      value={order.estimatedArrivalDate?.split('T')[0] ?? '—'} />
            <Row label="Adresse de livraison" value={formatAddress(order.deliveryAddress)} />
          </div>

          {/* Note opérateur */}
          {order.operatorNotes && (
            <div style={{ background: 'rgba(99,102,241,0.2)', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(99,102,241,0.4)' }}>
              <p className="text-white/60 text-xs font-medium mb-1">Note opérateur</p>
              <p className="text-white text-sm">{order.operatorNotes}</p>
            </div>
          )}

          {/* Motif rejet/annulation */}
          {order.rejectionReason && (
            <div style={{ background: 'rgba(239,68,68,0.2)', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(239,68,68,0.4)' }}>
              <p className="text-white/60 text-xs font-medium mb-1">Motif</p>
              <p className="text-white text-sm">{order.rejectionReason}</p>
            </div>
          )}

          {/* Véhicules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-white font-semibold text-sm">Véhicules ({vehicles.length})</p>
              <button onClick={() => setShowChassis(v => !v)}
                className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors">
                {showChassis ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showChassis ? 'Masquer' : 'Révéler châssis'}
              </button>
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {vehicles.map((v: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <span className="font-mono text-sm text-white font-semibold">
                    {showChassis ? v.chassisId : maskChassis(v.chassisId)}
                  </span>
                  <span className="text-white/70 text-xs">{v.vehicleModelLabel ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-3 p-5 border-t border-white/10">
          {canCancel ? (
            <button onClick={() => { onClose(); onCancel() }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.5)' }}>
              <Ban className="w-3.5 h-3.5" />
              Demander annulation
            </button>
          ) : <div />}
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Progress timeline ─────────────────────────────────────────────────────────

const STATUS_STEPS = ['PENDING_VALIDATION', 'VALIDATED', 'PLANNED', 'IN_TRANSIT', 'DELIVERED']
const CANCELLATION_STATUSES = ['CANCELLATION_REQUESTED', 'CANCELLATION_PENDING', 'CANCELLED', 'CANCELLATION_REJECTED']

function OrderTimeline({ status }: { status: string }) {
  if (status === 'REJECTED') {
    return <span className="text-xs text-red-400 font-medium flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejetée</span>
  }
  if (CANCELLATION_STATUSES.includes(status)) {
    const label: Record<string, string> = {
      CANCELLATION_REQUESTED: 'Annulation demandée',
      CANCELLATION_PENDING:   'En attente responsable',
      CANCELLED:              'Annulée',
      CANCELLATION_REJECTED:  'Annulation refusée',
    }
    const color = status === 'CANCELLED' ? 'text-red-400' : status === 'CANCELLATION_REJECTED' ? 'text-orange-400' : 'text-amber-400'
    return <span className={`text-xs font-medium flex items-center gap-1 mt-1 ${color}`}><Ban className="w-3 h-3" /> {label[status]}</span>
  }
  const current = STATUS_STEPS.indexOf(status)
  return (
    <div className="flex items-center gap-1 mt-2 flex-wrap">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} className={`h-1.5 w-5 rounded-full transition-colors ${i <= current ? 'bg-brand-500' : 'bg-navy-600'}`} />
      ))}
      <span className="text-[10px] text-slate-500 ml-1">{status.replace(/_/g, ' ')}</span>
    </div>
  )
}

// ── Order card ────────────────────────────────────────────────────────────────

function OrderCard({ order, index, onDetail, onCancel }: {
  order: any; index: number
  onDetail: () => void; onCancel: () => void
}) {
  const vehicles: ChassisItem[] = order.vehicles ?? []
  const [expanded, setExpanded] = useState(false)
  const canCancel = CANCEL_STATUSES.includes(order.status)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-hover p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-brand-600/10 border border-brand-500/20 flex-shrink-0 flex items-center justify-center mt-0.5">
            <Package className="w-4 h-4 text-brand-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-slate-500 mb-0.5">
              {order.orderNumber ?? `#${order.id?.substring(0, 8)}`}
            </p>
            <div className="flex items-center gap-1.5 text-sm text-slate-300 mb-1">
              <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <span className="truncate">{formatAddress(order.deliveryAddress)}</span>
            </div>
            {/* Chassis masqués */}
            {vehicles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                {vehicles.slice(0, expanded ? vehicles.length : 3).map((v: any, i: number) => (
                  <span key={i}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20"
                    title="ID masqué — cliquez sur Détails pour voir">
                    {maskChassis(v.chassisId)}
                  </span>
                ))}
                {!expanded && vehicles.length > 3 && (
                  <button onClick={() => setExpanded(true)}
                    className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-0.5">
                    +{vehicles.length - 3} <ChevronDown className="w-2.5 h-2.5" />
                  </button>
                )}
                {expanded && vehicles.length > 3 && (
                  <button onClick={() => setExpanded(false)}
                    className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-0.5">
                    Réduire <ChevronUp className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-slate-500 mb-0.5">
              {vehicles.length} châssis · {[...new Set(vehicles.map((v: any) => v.vehicleModelLabel).filter(Boolean))].join(', ')}
            </p>
            <p className="text-xs text-slate-600">{formatDateTime(order.createdAt)}</p>
            <OrderTimeline status={order.status} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={order.status} />
          <div className="flex items-center gap-1.5">
            <button onClick={onDetail}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-navy-600/40 transition-colors">
              <Eye className="w-3 h-3" /> Détails
            </button>
            {canCancel && (
              <button onClick={onCancel}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors">
                <Ban className="w-3 h-3" /> Annuler
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES  = ['PENDING_VALIDATION', 'VALIDATED', 'PLANNED', 'IN_TRANSIT',
                          'CANCELLATION_REQUESTED', 'CANCELLATION_PENDING']
const HISTORY_STATUSES = ['DELIVERED', 'REJECTED', 'CANCELLED', 'CANCELLATION_REJECTED']

export default function ClientOrdersPage() {
  const { user } = useAuthStore()
  const uid = user?.keycloakId

  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [tab, setTab]           = useState<'active' | 'history'>('active')
  const [page, setPage]         = useState(0)
  const [dateFilter, setDateFilter] = useState('')
  const [detailOrder, setDetailOrder]   = useState<any | null>(null)
  const [cancelOrder,  setCancelOrder]  = useState<any | null>(null)

  const { data: vehicleModels = [] } = useQuery<VehicleModel[]>({
    queryKey: ['vehicle-models-active'],
    queryFn: getActiveVehicleModels,
  })

  const { data: orders = [], isLoading, dataUpdatedAt } = useQuery<any[]>({
    queryKey: ['client-orders', uid],
    queryFn: getMyOrders,
    enabled: !!uid,
    refetchInterval: 30_000,
    staleTime: 0,
  })

  // Unique dates from all orders (for dropdown)
  const allDates = [...new Set(
    orders.map(o => o.createdAt?.split('T')[0]).filter(Boolean)
  )].sort((a, b) => b.localeCompare(a)) as string[]

  const filterByDate = (list: any[]) =>
    dateFilter ? list.filter(o => o.createdAt?.startsWith(dateFilter)) : list

  const activeOrders  = filterByDate(orders.filter(o => ACTIVE_STATUSES.includes(o.status)))
  const historyOrders = filterByDate(orders.filter(o => HISTORY_STATUSES.includes(o.status)))
  const allDisplayed  = tab === 'active' ? activeOrders : historyOrders
  const totalPages    = Math.ceil(allDisplayed.length / PAGE_SIZE)
  const displayed     = allDisplayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Mes commandes" subtitle="Suivez vos véhicules en temps réel" />

      <div className="flex-1 p-6 space-y-5">

        {/* Toolbar */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 flex-wrap">

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-navy-800/60 rounded-lg p-1">
            <button
              onClick={() => { setTab('active'); setPage(0) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === 'active' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}>
              <Clock className="w-3.5 h-3.5" />
              En cours
              {activeOrders.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === 'active' ? 'bg-white/20' : 'bg-navy-700'}`}>
                  {activeOrders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setTab('history'); setPage(0) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === 'history' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}>
              <History className="w-3.5 h-3.5" />
              Historique
              {historyOrders.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === 'history' ? 'bg-white/20' : 'bg-navy-700'}`}>
                  {historyOrders.length}
                </span>
              )}
            </button>
          </div>

          {/* Date filter — liste des dates existantes */}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <select
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setPage(0) }}
              className="input-dark text-xs py-1.5 px-2 min-w-[160px]">
              <option value="">Toutes les dates</option>
              {allDates.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {dateFilter && (
              <button onClick={() => { setDateFilter(''); setPage(0) }}
                className="text-slate-500 hover:text-slate-300 transition-colors">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {dataUpdatedAt > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-slate-600">
                <RefreshCw className="w-3 h-3" />
                Sync auto
              </span>
            )}
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-600/40 hover:bg-emerald-600/10 text-emerald-400 text-xs font-medium transition-colors">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Importer Excel
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
              Nouvelle commande
            </button>
          </div>
        </motion.div>

        {/* Content */}
        {isLoading ? <PageLoader /> : displayed.length === 0 ? (
          <EmptyState
            title={tab === 'active' ? 'Aucune commande en cours' : 'Aucun historique'}
            description={tab === 'active'
              ? 'Passez une commande manuellement ou importez depuis Excel.'
              : 'Les commandes livrées ou rejetées apparaîtront ici.'}
            action={tab === 'active' ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setShowImport(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-emerald-600/40 text-emerald-400 hover:bg-emerald-600/10 transition-colors">
                  <FileSpreadsheet className="w-4 h-4 inline mr-1.5" />Importer Excel
                </button>
                <button onClick={() => setShowCreate(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white transition-colors">
                  Passer une commande
                </button>
              </div>
            ) : undefined}
          />
        ) : (
          <>
            <div className="space-y-3">
              {displayed.map((order: any, i: number) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  index={i}
                  onDetail={() => setDetailOrder(order)}
                  onCancel={() => setCancelOrder(order)}
                />
              ))}
            </div>
            <div className="glass mt-2 rounded-xl">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalElements={allDisplayed.length}
                pageSize={PAGE_SIZE}
              />
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateOrderModal vehicleModels={vehicleModels} onClose={() => setShowCreate(false)} />
      )}
      {showImport && (
        <ImportModal vehicleModels={vehicleModels} onClose={() => setShowImport(false)} />
      )}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onCancel={() => { setDetailOrder(null); setCancelOrder(detailOrder) }}
        />
      )}
      {cancelOrder && (
        <CancelOrderModal order={cancelOrder} onClose={() => setCancelOrder(null)} />
      )}
    </div>
  )
}
