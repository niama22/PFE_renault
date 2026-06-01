import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Package, Plus, MapPin, UserCircle, Trash2,
  Upload, Download, FileSpreadsheet, CheckCircle2, XCircle,
  Clock, History, RefreshCw,
} from 'lucide-react'
import Pagination from '@/components/shared/Pagination'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { NavLink } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { getMyOrders, createOrder } from '@/api/client.api'
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
      requestedDeliveryDate: '',
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

// ── Progress timeline ─────────────────────────────────────────────────────────

const STATUS_STEPS = ['PENDING_VALIDATION', 'VALIDATED', 'PLANNED', 'IN_TRANSIT', 'DELIVERED']

function OrderTimeline({ status }: { status: string }) {
  if (status === 'REJECTED') {
    return <span className="text-xs text-red-400 font-medium flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejetée</span>
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

function OrderCard({ order, index }: { order: any; index: number }) {
  const vehicles: ChassisItem[] = order.vehicles ?? []
  const city = extractCity(order.deliveryAddress)

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
            {vehicles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                {vehicles.slice(0, 4).map((v, i) => (
                  <span key={i}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20"
                    title={v.vehicleModelLabel}>
                    {v.chassisId}
                  </span>
                ))}
                {vehicles.length > 4 && (
                  <span className="text-[10px] text-slate-500">+{vehicles.length - 4} autre(s)</span>
                )}
              </div>
            )}
            {vehicles.length > 0 && (
              <p className="text-xs text-slate-500 mb-0.5">
                {vehicles.length} châssis · {[...new Set(vehicles.map(v => v.vehicleModelLabel).filter(Boolean))].join(', ')}
              </p>
            )}
            <p className="text-xs text-slate-600">{formatDateTime(order.createdAt)}</p>
            <OrderTimeline status={order.status} />
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES  = ['PENDING_VALIDATION', 'VALIDATED', 'PLANNED', 'IN_TRANSIT']
const HISTORY_STATUSES = ['DELIVERED', 'REJECTED']

export default function ClientOrdersPage() {
  const { user } = useAuthStore()
  const uid = user?.keycloakId

  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [tab, setTab] = useState<'active' | 'history'>('active')
  const [page, setPage] = useState(0)

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

  const activeOrders  = orders.filter(o => ACTIVE_STATUSES.includes(o.status))
  const historyOrders = orders.filter(o => HISTORY_STATUSES.includes(o.status))
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
                <OrderCard key={order.id} order={order} index={i} />
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
    </div>
  )
}
