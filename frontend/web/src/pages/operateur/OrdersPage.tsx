import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  CheckCircle2, XCircle, Search, Hash,
  FileSpreadsheet, Download, Upload, Edit3, Save, X, Activity, Archive,
  CalendarDays, MapPin,
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { getOrders, validateOrder, rejectOrder, updateOrder } from '@/api/operateur.api'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/shared/StatusBadge'
import EmptyState from '@/components/shared/EmptyState'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import Pagination from '@/components/shared/Pagination'
import type { Order, ChassisItem } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractCity(addr: any): string {
  if (!addr) return '—'
  if (typeof addr === 'object') return addr.city ?? '—'
  return (addr as string).split(',')[1]?.trim() ?? '—'
}

function formatDestination(addr: any): string {
  if (!addr) return '—'
  if (typeof addr === 'string') return addr.split(',')[0] ?? addr
  return [addr.street, addr.postalCode].filter(Boolean).join(' ')
}

function formatDate(d: string | undefined): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d }
}

function expandToChassis(order: any) {
  let vehicles: ChassisItem[] = []
  if (Array.isArray(order.vehicles)) vehicles = order.vehicles
  else if (typeof order.vehicles === 'string') try { vehicles = JSON.parse(order.vehicles) } catch { vehicles = [] }

  const destination = formatDestination(order.deliveryAddress)
  const city        = extractCity(order.deliveryAddress)
  const dateSortie  = formatDate(order.requestedDeliveryDate)
  const canValidate = order.status === 'PENDING_VALIDATION'
  const clientCode  = order.clientCode ?? order.clientId?.substring(0, 8) ?? '—'

  if (vehicles.length === 0) return [{ orderId: order.id, orderNumber: order.orderNumber ?? order.id.substring(0, 8), clientCode, chassisId: '—', model: '—', destination, city, dateSortie, status: order.status, canValidate }]
  return vehicles.map((v: ChassisItem) => ({ orderId: order.id, orderNumber: order.orderNumber ?? order.id.substring(0, 8), clientCode, chassisId: v.chassisId ?? '—', model: v.vehicleModelLabel ?? '—', destination, city, dateSortie, status: order.status, canValidate }))
}

// ── Excel export ──────────────────────────────────────────────────────────────

function exportToExcel(chassisRows: ReturnType<typeof expandToChassis>) {
  const data = [
    ['Châssis', 'Modèle', 'Destination', 'Ville', 'Date sortie', 'Client', 'Statut', 'Commande #'],
    ...chassisRows.map(r => [r.chassisId, r.model, r.destination, r.city, r.dateSortie, r.clientCode, r.status, r.orderNumber]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [16, 20, 24, 16, 12, 12, 20, 14].map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Commandes')
  XLSX.writeFile(wb, `commandes_operateur_${new Date().toISOString().split('T')[0]}.xlsx`)
}

// ── Excel import modal ────────────────────────────────────────────────────────

function ImportModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [rows, setRows] = useState<any[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Client Code', 'Modèle', 'Chassis ID', 'Date livraison', 'Rue', 'Ville', 'Code postal', 'Pays'],
      ['client1', 'Dacia Sandero', 'DASAN26XXXXX', '2026-06-15', '123 Avenue Hassan II', 'Rabat', '10000', 'Maroc'],
      ['client1', 'Renault Clio',  'RECLI26XXXXX', '2026-06-15', '123 Avenue Hassan II', 'Rabat', '10000', 'Maroc'],
    ])
    ws['!cols'] = [12, 18, 14, 14, 25, 15, 12, 10].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Import')
    XLSX.writeFile(wb, 'template_import_operateur.xlsx')
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target!.result, { type: 'binary', cellDates: true })
        const data: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
        const parseErrors: string[] = []
        const parsed: any[] = []
        for (let i = 1; i < data.length; i++) {
          const [clientCode, modelLabel, chassisId, date, street, city, postalCode, country] = data[i]
          if (!clientCode && !modelLabel) continue
          if (!String(chassisId).trim()) { parseErrors.push(`Ligne ${i+1} : chassis ID manquant`); continue }
          let deliveryDate = date instanceof Date ? date.toISOString().split('T')[0] : String(date).trim()
          if (!deliveryDate.match(/^\d{4}-\d{2}-\d{2}$/)) { parseErrors.push(`Ligne ${i+1} : date invalide`); continue }
          parsed.push({ clientCode: String(clientCode).trim(), modelLabel: String(modelLabel).trim(), chassisId: String(chassisId).trim().toUpperCase(), deliveryDate, street: String(street).trim(), city: String(city).trim(), postalCode: String(postalCode).trim(), country: String(country || 'Maroc').trim() })
        }
        setErrors(parseErrors); setRows(parsed)
      } catch { setErrors(['Impossible de lire le fichier.']) }
    }
    reader.readAsBinaryString(file)
  }

  async function handleImport() {
    setImporting(true)
    const groups: Record<string, typeof rows> = {}
    for (const row of rows) {
      const key = `${row.clientCode}|${row.deliveryDate}|${row.street}|${row.city}`
      if (!groups[key]) groups[key] = []
      groups[key].push(row)
    }
    let created = 0
    for (const [, group] of Object.entries(groups)) {
      try {
        const body = {
          clientCode: group[0].clientCode,
          vehicles: group.map(r => ({ chassisId: r.chassisId, vehicleModelLabel: r.modelLabel })),
          requestedDeliveryDate: group[0].deliveryDate,
          deliveryAddress: { street: group[0].street, city: group[0].city, postalCode: group[0].postalCode, country: group[0].country },
        }
        await fetch('/api/operateur/orders/import-json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
          body: JSON.stringify(body),
        })
        created++
      } catch { setErrors(e => [...e, 'Erreur lors de la création']) }
    }
    setImporting(false); setDone(true)
    toast.success(`${created} commande(s) importée(s)`)
    qc.invalidateQueries({ queryKey: ['operateur-orders'] })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 glass w-full max-w-lg rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          <h2 className="text-slate-100 font-semibold text-base">Importer commandes Excel</h2>
        </div>
        <div className="bg-navy-800/60 rounded-xl p-3 mb-4 text-xs text-slate-400">
          <p className="font-medium text-slate-300 mb-1.5">Colonnes attendues :</p>
          <div className="grid grid-cols-4 gap-1 text-[10px]">
            {['Client Code','Modèle','Chassis ID','Date livraison','Rue','Ville','Code postal','Pays'].map(h => (
              <span key={h} className="bg-navy-700 px-1.5 py-0.5 rounded text-slate-400 text-center truncate">{h}</span>
            ))}
          </div>
        </div>
        <button onClick={downloadTemplate} className="flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 mb-4 transition-colors">
          <Download className="w-3.5 h-3.5" /> Télécharger modèle Excel
        </button>
        {!done && (
          <label className="flex flex-col items-center border-2 border-dashed border-navy-600 hover:border-brand-500/50 rounded-xl p-6 cursor-pointer transition-colors mb-4">
            <Upload className="w-6 h-6 text-slate-500 mb-2" />
            <span className="text-sm text-slate-400">Cliquez ou glissez un fichier .xlsx</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
          </label>
        )}
        {errors.map((e, i) => <p key={i} className="text-xs text-red-400 flex items-center gap-1 mb-1"><XCircle className="w-3 h-3" />{e}</p>)}
        {rows.length > 0 && !done && (
          <div className="mb-4">
            <p className="text-xs text-slate-400 mb-2">{rows.length} ligne(s) — aperçu :</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {rows.slice(0, 6).map((r, i) => (
                <div key={i} className="flex gap-2 text-xs text-slate-300 bg-navy-800/40 px-2 py-1 rounded">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="font-mono text-brand-300">{r.chassisId}</span>
                  <span>{r.modelLabel}</span>
                  <span className="text-slate-500">· {r.clientCode} · {r.deliveryDate}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {done && <p className="text-emerald-400 text-sm flex items-center gap-2 mb-4"><CheckCircle2 className="w-4 h-4" />Import terminé.</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-navy-700 transition-colors">{done ? 'Fermer' : 'Annuler'}</button>
          {!done && <button onClick={handleImport} disabled={rows.length === 0 || importing} className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-colors">{importing ? 'Import...' : `Importer (${rows.length})`}</button>}
        </div>
      </motion.div>
    </div>
  )
}

// ── Edit order modal ──────────────────────────────────────────────────────────

function EditOrderModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const qc = useQueryClient()

  let initVehicles: ChassisItem[] = []
  if (Array.isArray(order.vehicles)) initVehicles = order.vehicles
  else if (typeof (order as any).vehiclesJson === 'string') try { initVehicles = JSON.parse((order as any).vehiclesJson) } catch {}

  let initAddr: Record<string, string> = { street: '', city: '', postalCode: '', country: 'Maroc' }
  if (order.deliveryAddress && typeof order.deliveryAddress === 'object') {
    initAddr = { street: '', city: '', postalCode: '', country: 'Maroc', ...order.deliveryAddress }
  } else if (typeof order.deliveryAddress === 'string') {
    try { initAddr = { ...initAddr, ...JSON.parse(order.deliveryAddress as string) } } catch {}
  }

  const [date, setDate] = useState(order.requestedDeliveryDate?.split('T')[0] ?? '')
  const [addr, setAddr] = useState(initAddr)
  const [notes, setNotes] = useState(order.operatorNotes ?? '')
  const [rows, setRows] = useState(initVehicles.map(v => ({ ...v })))

  const mutation = useMutation({
    mutationFn: () => updateOrder(order.id, {
      requestedDeliveryDate: date || undefined,
      deliveryAddressJson: JSON.stringify(addr),
      vehiclesJson: JSON.stringify(rows),
      operatorNotes: notes || undefined,
    }),
    onSuccess: () => { toast.success('Commande modifiée'); qc.invalidateQueries({ queryKey: ['operateur-orders'] }); onClose() },
    onError: () => toast.error('Erreur lors de la modification'),
  })

  function updateChassis(idx: number, field: 'chassisId' | 'vehicleModelLabel', val: string) {
    setRows(r => r.map((row, i) => i === idx ? { ...row, [field]: field === 'chassisId' ? val.toUpperCase() : val } : row))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 glass w-full max-w-xl rounded-2xl shadow-2xl p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-slate-100 font-semibold text-base">Modifier la commande</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              #{order.orderNumber ?? order.id.substring(0, 8)}
              {order.clientCode && <span className="ml-2 text-brand-300">· {order.clientCode}</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Date de livraison souhaitée</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="input-dark w-full" style={{ colorScheme: 'dark' }} />
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-2 font-medium">Adresse de livraison</p>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Rue / Adresse</label>
                <input value={addr.street ?? ''} onChange={e => setAddr(a => ({ ...a, street: e.target.value }))}
                  placeholder="Ex : 123 Avenue Hassan II" className="input-dark w-full text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Ville</label>
                  <input value={addr.city ?? ''} onChange={e => setAddr(a => ({ ...a, city: e.target.value }))}
                    placeholder="Ex : Rabat" className="input-dark w-full text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Code postal</label>
                  <input value={addr.postalCode ?? ''} onChange={e => setAddr(a => ({ ...a, postalCode: e.target.value }))}
                    placeholder="Ex : 10000" className="input-dark w-full text-sm" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Pays</label>
                <input value={addr.country ?? 'Maroc'} onChange={e => setAddr(a => ({ ...a, country: e.target.value }))}
                  className="input-dark w-full text-sm" />
              </div>
            </div>
          </div>

          {rows.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2 font-medium">Véhicules & IDs Châssis ({rows.length})</p>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {rows.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr] gap-2 items-center p-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div>
                      <label className="text-[10px] text-slate-600 mb-0.5 block">Modèle</label>
                      <input value={v.vehicleModelLabel ?? ''} onChange={e => updateChassis(idx, 'vehicleModelLabel', e.target.value)}
                        placeholder="Ex : Dacia Sandero" className="input-dark w-full text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600 mb-0.5 block">ID Châssis</label>
                      <div className="relative">
                        <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                        <input value={v.chassisId ?? ''} onChange={e => updateChassis(idx, 'chassisId', e.target.value)}
                          className="input-dark w-full pl-7 font-mono text-xs uppercase" style={{ letterSpacing: '0.04em' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Notes opérateur</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={2} placeholder="Observations, instructions spéciales..."
              className="input-dark w-full resize-none text-sm" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors">
            Annuler
          </button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50 transition-colors">
            <Save className="w-3.5 h-3.5" /> {mutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Reject modal ──────────────────────────────────────────────────────────────

function RejectModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')
  const mutation = useMutation({
    mutationFn: () => rejectOrder(order.id, reason),
    onSuccess: () => { toast.success('Commande rejetée'); qc.invalidateQueries({ queryKey: ['operateur-orders'] }); onClose() },
    onError: () => toast.error('Erreur'),
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 glass p-6 w-full max-w-md rounded-2xl shadow-2xl">
        <h2 className="text-slate-100 font-semibold text-base mb-2">Rejeter la commande</h2>
        <p className="text-xs text-slate-500 mb-4">#{order.id.substring(0, 8)}</p>
        <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Motif (optionnel)..." rows={3} className="input-dark w-full resize-none mb-4" />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-navy-700 transition-colors">Annuler</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors">{mutation.isPending ? 'Chargement...' : 'Rejeter'}</button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Orders table ──────────────────────────────────────────────────────────────

function OrdersTable({
  chassisRows,
  orderMap,
  totalPages,
  totalElements,
  page,
  onPageChange,
  onEdit,
  onValidate,
  onReject,
  readonly = false,
}: {
  chassisRows: ReturnType<typeof expandToChassis>
  orderMap: Record<string, any>
  totalPages: number
  totalElements?: number
  page: number
  onPageChange: (p: number) => void
  onEdit?: (o: Order) => void
  onValidate?: (o: Order) => void
  onReject?: (o: Order) => void
  readonly?: boolean
}) {
  if (chassisRows.length === 0) return (
    <EmptyState title="Aucun châssis" description="Aucune commande ne correspond aux filtres." />
  )

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Châssis', 'Modèle', 'Destination', 'Ville', 'Date sortie', 'Client', 'Statut', readonly ? '' : ''].map((h, i) => (
                <th key={i} className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chassisRows.map((row, i) => {
              const prevRow = chassisRows[i - 1]
              const isNewOrder = !prevRow || prevRow.orderId !== row.orderId
              return (
                <motion.tr key={`${row.orderId}-${row.chassisId}-${i}`}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.015, 0.3) }}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', borderTop: isNewOrder && i > 0 ? '1px solid rgba(255,255,255,0.08)' : undefined }}
                  className="hover:bg-white/[0.02] transition-colors">

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3 h-3 text-slate-600 flex-shrink-0" />
                      <span className="text-xs font-mono text-brand-300 font-semibold tracking-wide">{row.chassisId}</span>
                    </div>
                    {isNewOrder && <p className="text-[10px] text-slate-600 font-mono mt-0.5">#{row.orderNumber}</p>}
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-300">{row.model}</span></td>
                  <td className="px-4 py-3 max-w-[160px]"><span className="text-xs text-slate-400 truncate block">{row.destination}</span></td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-300 font-medium">{row.city}</span></td>
                  <td className="px-4 py-3 whitespace-nowrap"><span className="text-xs text-slate-400">{row.dateSortie}</span></td>
                  <td className="px-4 py-3">
                    {isNewOrder && <span className="text-xs font-medium text-slate-300 bg-navy-700/60 px-2 py-0.5 rounded">{row.clientCode}</span>}
                  </td>
                  <td className="px-4 py-3">{isNewOrder && <StatusBadge status={row.status} />}</td>
                  <td className="px-4 py-3">
                    {!readonly && isNewOrder && (
                      <div className="flex items-center justify-end gap-1">
                        {row.canValidate && (
                          <button onClick={() => onEdit?.(orderMap[row.orderId] as Order)}
                            className="p-1.5 rounded-lg hover:bg-blue-600/15 text-slate-500 hover:text-blue-400 transition-colors" title="Modifier">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {row.canValidate && (
                          <>
                            <button onClick={() => onValidate?.(orderMap[row.orderId] as Order)}
                              className="p-1.5 rounded-lg hover:bg-emerald-600/15 text-slate-500 hover:text-emerald-400 transition-colors" title="Valider">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => onReject?.(orderMap[row.orderId] as Order)}
                              className="p-1.5 rounded-lg hover:bg-red-600/15 text-slate-500 hover:text-red-400 transition-colors" title="Rejeter">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange}
        totalElements={totalElements} pageSize={2} />
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Section = 'active' | 'history'

// Active statuses: orders still in the pipeline
const ACTIVE_STATUSES = ['PENDING_VALIDATION', 'VALIDATED', 'PLANNED', 'IN_PROGRESS', 'IN_TRANSIT']

export default function OperateurOrdersPage() {
  const qc = useQueryClient()
  const [section, setSection] = useState<Section>('active')

  // Active section state
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ACTIVE')
  const [dateFilter, setDateFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [confirmValidate, setConfirmValidate] = useState<Order | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Order | null>(null)
  const [editTarget, setEditTarget] = useState<Order | null>(null)
  const [showImport, setShowImport] = useState(false)

  const hasClientFilters = !!(dateFilter || cityFilter)

  // Active orders query — larger page when local filters active so results are complete
  const apiStatus = statusFilter === 'ACTIVE' ? undefined : (statusFilter || undefined)
  const { data, isLoading } = useQuery({
    queryKey: ['operateur-orders', page, statusFilter, hasClientFilters],
    queryFn: () => getOrders(hasClientFilters ? 0 : page, hasClientFilters ? 50 : 2, apiStatus),
    enabled: section === 'active',
  })

  // History (delivered) orders query
  const [historyPage, setHistoryPage] = useState(0)
  const [historySearch, setHistorySearch] = useState('')
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['operateur-orders-history', historyPage],
    queryFn: () => getOrders(historyPage, 2, 'DELIVERED'),
    enabled: section === 'history',
  })

  const validateMutation = useMutation({
    mutationFn: (id: string) => validateOrder(id),
    onSuccess: () => { toast.success('Commande validée'); qc.invalidateQueries({ queryKey: ['operateur-orders'] }); setConfirmValidate(null) },
    onError: () => toast.error('Erreur'),
  })

  // Active section data
  const orders = data?.content ?? []
  const totalPages = hasClientFilters ? 1 : (data?.totalPages ?? 1)
  const filteredOrders = orders.filter((o: any) => {
    if (statusFilter === 'ACTIVE' && !ACTIVE_STATUSES.includes(o.status)) return false
    const addr = typeof o.deliveryAddress === 'string' ? o.deliveryAddress : JSON.stringify(o.deliveryAddress ?? '')
    if (!`${o.clientCode ?? ''} ${addr}`.toLowerCase().includes(search.toLowerCase())) return false
    if (dateFilter && o.requestedDeliveryDate?.split('T')[0] !== dateFilter) return false
    if (cityFilter) {
      const city = extractCity(o.deliveryAddress).toLowerCase()
      if (!city.includes(cityFilter.toLowerCase())) return false
    }
    return true
  })
  const chassisRows = filteredOrders.flatMap((o: any) => expandToChassis(o))
  const orderMap = Object.fromEntries(orders.map((o: any) => [o.id, o]))

  // Build city and date lists from loaded orders for dropdowns
  const availableCities = Array.from(
    new Set(orders.map((o: any) => extractCity(o.deliveryAddress)).filter((c: string) => c && c !== '—'))
  ).sort() as string[]

  const availableDates = Array.from(
    new Set(
      orders
        .map((o: any) => o.requestedDeliveryDate?.split('T')[0])
        .filter(Boolean)
    )
  ).sort() as string[]

  // History section data
  const historyOrders = historyData?.content ?? []
  const historyTotalPages = historyData?.totalPages ?? 1
  const filteredHistory = historyOrders.filter((o: any) => {
    const addr = typeof o.deliveryAddress === 'string' ? o.deliveryAddress : JSON.stringify(o.deliveryAddress ?? '')
    return `${o.clientCode ?? ''} ${addr}`.toLowerCase().includes(historySearch.toLowerCase())
  })
  const historyChassis = filteredHistory.flatMap((o: any) => expandToChassis(o))
  const historyOrderMap = Object.fromEntries(historyOrders.map((o: any) => [o.id, o]))

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Commandes" subtitle="Suivi des commandes clients" />

      <div className="flex-1 p-6 space-y-5">

        {/* Section toggle */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
          <button
            onClick={() => setSection('active')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              section === 'active'
                ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                : 'glass text-slate-500 hover:text-slate-300 border border-transparent'
            }`}>
            <Activity className="w-4 h-4" />
            Commandes actives
          </button>
          <button
            onClick={() => setSection('history')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              section === 'history'
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                : 'glass text-slate-500 hover:text-slate-300 border border-transparent'
            }`}>
            <Archive className="w-4 h-4" />
            Historique livré
          </button>
        </motion.div>

        {/* ── ACTIVE SECTION ─────────────────────────────────────────────────── */}
        {section === 'active' && (
          <>
            {/* Toolbar */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 flex-wrap justify-between">
              <div className="flex items-center gap-3 flex-1 flex-wrap">
                <div className="relative min-w-[180px] max-w-xs flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher client / adresse..." className="input-dark w-full pl-9 text-sm" />
                </div>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }} className="input-dark text-sm">
                  <option value="ACTIVE">Tous actifs (défaut)</option>
                  <option value="">Tous les statuts</option>
                  <option value="PENDING_VALIDATION">En attente validation</option>
                  <option value="VALIDATED">Validé</option>
                  <option value="REJECTED">Rejeté</option>
                  <option value="PLANNED">Planifié</option>
                  <option value="IN_PROGRESS">En traitement</option>
                  <option value="IN_TRANSIT">En transit</option>
                </select>
                {/* Date filter */}
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  <select
                    value={dateFilter}
                    onChange={e => { setDateFilter(e.target.value); setPage(0) }}
                    className="input-dark pl-9 text-sm w-48"
                  >
                    <option value="">Toutes les dates</option>
                    {availableDates.map(d => (
                      <option key={d} value={d}>
                        {new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                </div>
                {/* City filter */}
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  {availableCities.length > 0 ? (
                    <select
                      value={cityFilter}
                      onChange={e => { setCityFilter(e.target.value); setPage(0) }}
                      className="input-dark pl-9 pr-7 text-sm w-40"
                    >
                      <option value="">Toutes les villes</option>
                      {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input
                      value={cityFilter}
                      onChange={e => { setCityFilter(e.target.value); setPage(0) }}
                      placeholder="Ville..."
                      className="input-dark pl-9 text-sm w-36"
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-600/40 hover:bg-emerald-600/10 text-emerald-400 text-xs font-medium transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Importer Excel
                </button>
                {chassisRows.length > 0 && (
                  <button onClick={() => exportToExcel(chassisRows)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-brand-600/40 hover:bg-brand-600/10 text-brand-400 text-xs font-medium transition-colors">
                    <Download className="w-3.5 h-3.5" /> Exporter Excel
                  </button>
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass overflow-hidden">
              {isLoading ? <PageLoader /> : (
                <OrdersTable
                  chassisRows={chassisRows}
                  orderMap={orderMap}
                  totalPages={totalPages}
                  totalElements={data?.totalElements}
                  page={page}
                  onPageChange={setPage}
                  onEdit={setEditTarget}
                  onValidate={setConfirmValidate}
                  onReject={setRejectTarget}
                />
              )}
            </motion.div>
          </>
        )}

        {/* ── HISTORY SECTION ───────────────────────────────────────────────── */}
        {section === 'history' && (
          <>
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 flex-wrap justify-between">
              <div className="relative min-w-[200px] max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Rechercher dans l'historique..." className="input-dark w-full pl-9 text-sm" />
              </div>
              {historyChassis.length > 0 && (
                <button onClick={() => exportToExcel(historyChassis)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-brand-600/40 hover:bg-brand-600/10 text-brand-400 text-xs font-medium transition-colors">
                  <Download className="w-3.5 h-3.5" /> Exporter Excel
                </button>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {/* History header */}
              <div className="glass-card px-5 py-3 mb-3 flex items-center gap-3 rounded-xl"
                style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Commandes livrées</p>
                  <p className="text-xs text-slate-500">
                    {historyData?.totalElements ?? 0} commande(s) terminée(s) · Archivées après livraison confirmée
                  </p>
                </div>
              </div>

              <div className="glass overflow-hidden">
                {historyLoading ? <PageLoader /> : (
                  <OrdersTable
                    chassisRows={historyChassis}
                    orderMap={historyOrderMap}
                    totalPages={historyTotalPages}
                    totalElements={historyData?.totalElements}
                    page={historyPage}
                    onPageChange={setHistoryPage}
                    readonly
                  />
                )}
              </div>
            </motion.div>
          </>
        )}

      </div>

      <ConfirmDialog open={!!confirmValidate} onOpenChange={v => !v && setConfirmValidate(null)}
        title="Valider la commande" description={`Confirmer la validation de la commande #${confirmValidate?.id.substring(0, 8)} ?`}
        confirmLabel="Valider" onConfirm={() => confirmValidate && validateMutation.mutate(confirmValidate.id)} loading={validateMutation.isPending} />

      {rejectTarget && <RejectModal order={rejectTarget} onClose={() => setRejectTarget(null)} />}
      {editTarget   && <EditOrderModal order={editTarget} onClose={() => setEditTarget(null)} />}
      {showImport   && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
