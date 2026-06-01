import { useState } from 'react'
import { Truck, ArrowRightLeft } from 'lucide-react'
import type { ProposedTournee, DeliveryStop } from '@/types'

const ORIGIN = 'MELLOUSSA TANGER'

export function FillBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-400 w-10 text-right flex-shrink-0">
        {value.toFixed(1)}%
      </span>
    </div>
  )
}

export function recalcTournee(t: ProposedTournee): ProposedTournee {
  const reindexed = t.stops.map((s, i) => ({ ...s, sequence: i + 1 }))
  const totalWeight = reindexed.reduce((sum, s) => sum + s.weightKg, 0)
  const totalVolume = reindexed.reduce((sum, s) => sum + s.volumeM3, 0)
  const fillRate = t.truckMaxWeightKg > 0 ? (totalWeight / t.truckMaxWeightKg) * 100 : 0
  return { ...t, stops: reindexed, totalWeightKg: totalWeight, totalVolumeM3: totalVolume, fillRatePercent: fillRate, totalOrders: reindexed.length }
}

export function formatDate(d: string | undefined) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('fr-FR') } catch { return d }
}

function MoveStopSelect({
  stop, fromTruckId, tournees, onMove, onClose,
}: {
  stop: DeliveryStop; fromTruckId: string; tournees: ProposedTournee[]
  onMove: (s: DeliveryStop, f: string, t: string) => void; onClose: () => void
}) {
  return (
    <select autoFocus
      className="text-xs bg-slate-800 border border-brand-500/40 text-slate-200 rounded px-2 py-1 focus:outline-none"
      defaultValue=""
      onChange={e => { if (e.target.value) onMove(stop, fromTruckId, e.target.value); onClose() }}
      onBlur={onClose}
    >
      <option value="" disabled>Déplacer vers...</option>
      {tournees.filter(t => t.truckId !== fromTruckId).map(t => (
        <option key={t.truckId} value={t.truckId}>{t.truckLabel} ({t.truckPlate})</option>
      ))}
    </select>
  )
}

export function PlanningManifest({
  tournees,
  onDateChange,
  onMove,
  readOnly = false,
}: {
  tournees: ProposedTournee[]
  onDateChange?: (truckId: string, date: string) => void
  onMove?: (stop: DeliveryStop, fromTruckId: string, toTruckId: string) => void
  readOnly?: boolean
}) {
  const [movingStopId, setMovingStopId] = useState<string | null>(null)

  return (
    <div className="glass overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(124,58,237,0.07)' }}>
              {[
                { label: 'Date', w: 'w-28' },
                { label: 'Origine', w: 'w-40' },
                { label: 'Destination', w: '' },
                { label: 'Ville', w: 'w-28' },
                { label: 'Châssis', w: 'w-10 text-center' },
                { label: 'IDs Châssis', w: 'w-56' },
                { label: 'Modèles', w: 'w-40' },
                { label: 'Poids', w: 'w-20 text-right' },
                { label: '', w: 'w-10' },
              ].map(h => (
                <th key={h.label}
                  className={`px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${h.w}`}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tournees.map((tournee, ti) => (
              <>
                <tr
                  key={`header-${tournee.truckId}`}
                  style={{ background: 'rgba(255,255,255,0.03)', borderTop: ti > 0 ? '2px solid rgba(124,58,237,0.25)' : undefined, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <td colSpan={9} className="px-4 py-2.5">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-brand-500/15 border border-brand-500/25 flex items-center justify-center">
                          <Truck className="w-3 h-3 text-brand-400" />
                        </div>
                        <span className="text-xs font-semibold text-slate-200">
                          IT : <span className="font-mono text-brand-300">{tournee.truckPlate}</span>
                        </span>
                        <span className="text-xs text-slate-500">{tournee.truckLabel}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{tournee.stops.length} arrêt(s)</span>
                        <span>{tournee.totalWeightKg.toLocaleString('fr-FR')} kg</span>
                        {tournee.estimatedDistanceKm > 0 && <span>{tournee.estimatedDistanceKm.toFixed(0)} km</span>}
                      </div>
                      <div className="w-24 flex-shrink-0">
                        <FillBar value={tournee.fillRatePercent} />
                      </div>
                      <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                        <span className="text-xs text-slate-500">Date :</span>
                        {readOnly ? (
                          <span className="text-xs text-slate-300 px-2 py-1">{formatDate(tournee.plannedDate)}</span>
                        ) : (
                          <input
                            type="date"
                            value={tournee.plannedDate ?? ''}
                            onChange={e => onDateChange?.(tournee.truckId, e.target.value)}
                            className="px-2 py-1 rounded text-xs text-slate-200 focus:outline-none focus:border-brand-500/60"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
                          />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {tournee.stops.map((stop) => (
                  <tr
                    key={`${tournee.truckId}-${stop.orderId}`}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-xs text-slate-400">{formatDate(tournee.plannedDate)}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-emerald-400 font-medium">{ORIGIN}</span>
                    </td>
                    <td className="px-4 py-2.5 max-w-[200px]">
                      <span className="text-xs text-slate-300 block truncate">{stop.address}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-slate-300 font-medium">
                        {stop.city || stop.address?.split(',')[1]?.trim() || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs font-semibold text-brand-400">{stop.quantity}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {stop.chassisIds && stop.chassisIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {stop.chassisIds.map(cid => (
                            <span key={cid}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20">
                              {cid}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 max-w-[150px]">
                      <span className="text-xs text-slate-400 block truncate">{stop.vehicleModelLabel}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-xs text-slate-500">{stop.weightKg.toFixed(0)} kg</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {!readOnly && tournees.length > 1 && onMove && (
                        movingStopId === stop.orderId ? (
                          <MoveStopSelect
                            stop={stop} fromTruckId={tournee.truckId}
                            tournees={tournees} onMove={onMove}
                            onClose={() => setMovingStopId(null)}
                          />
                        ) : (
                          <button onClick={() => setMovingStopId(stop.orderId)}
                            title="Déplacer vers un autre IT"
                            className="p-1 rounded text-slate-600 hover:text-brand-400 hover:bg-brand-500/10 transition-colors">
                            <ArrowRightLeft className="w-3 h-3" />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
