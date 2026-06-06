import { responsableApi, operateurApi } from '@/lib/axios'
import type {
  ApiResponse, PageResult, Tournee, ResponsableStats,
  Truck, TruckStatus, VehicleModel, OptimizationResult, Incident, Order,
} from '@/types'

// ── Tournées ──────────────────────────────────────────
export const getTourneesResponsable = (status?: string) =>
  responsableApi.get<ApiResponse<PageResult<Tournee>>>('/tournees', {
    params: status ? { status, size: 50 } : { size: 50 },
  }).then(r => r.data.data?.content ?? [])

export const getTourneeDetail = (id: string) =>
  responsableApi.get<ApiResponse<Tournee>>(`/tournees/${id}`).then(r => r.data.data)

export const validateTournee = (id: string) =>
  responsableApi.patch<ApiResponse<Tournee>>(`/tournees/${id}/validate`).then(r => r.data.data)

export const rejectTournee = (id: string, reason: string) =>
  responsableApi.patch<ApiResponse<Tournee>>(`/tournees/${id}/reject`, { reason }).then(r => r.data.data)

export const getResponsableStats = () =>
  responsableApi.get<ApiResponse<ResponsableStats>>('/tournees/stats').then(r => r.data.data)

// ── Camions ───────────────────────────────────────────
export const getTrucks = () =>
  responsableApi.get<ApiResponse<Truck[]>>('/trucks').then(r => r.data.data ?? [])

export const getAvailableTrucks = () =>
  responsableApi.get<ApiResponse<Truck[]>>('/trucks/available').then(r => r.data.data ?? [])

export const createTruck = (data: Omit<Truck, 'id' | 'status' | 'createdAt' | 'updatedAt'>) =>
  responsableApi.post<ApiResponse<Truck>>('/trucks', data).then(r => r.data.data)

export const updateTruck = (id: string, data: Omit<Truck, 'id' | 'status' | 'createdAt' | 'updatedAt'>) =>
  responsableApi.put<ApiResponse<Truck>>(`/trucks/${id}`, data).then(r => r.data.data)

export const updateTruckStatus = (id: string, status: TruckStatus) =>
  responsableApi.patch<ApiResponse<Truck>>(`/trucks/${id}/status`, null, { params: { status } })
    .then(r => r.data.data)

export const deleteTruck = (id: string) =>
  responsableApi.delete(`/trucks/${id}`)

// ── Modèles de véhicules ──────────────────────────────
export const getVehicleModels = () =>
  responsableApi.get<ApiResponse<VehicleModel[]>>('/vehicle-models').then(r => r.data.data ?? [])

export const getActiveVehicleModels = () =>
  responsableApi.get<ApiResponse<VehicleModel[]>>('/vehicle-models/active').then(r => r.data.data ?? [])

export const createVehicleModel = (data: Omit<VehicleModel, 'id' | 'active' | 'createdAt' | 'updatedAt'>) =>
  responsableApi.post<ApiResponse<VehicleModel>>('/vehicle-models', data).then(r => r.data.data)

export const updateVehicleModel = (id: string, data: Omit<VehicleModel, 'id' | 'active' | 'createdAt' | 'updatedAt'>) =>
  responsableApi.put<ApiResponse<VehicleModel>>(`/vehicle-models/${id}`, data).then(r => r.data.data)

export const toggleVehicleModel = (id: string) =>
  responsableApi.patch<ApiResponse<VehicleModel>>(`/vehicle-models/${id}/toggle`).then(r => r.data.data)

export const deleteVehicleModel = (id: string) =>
  responsableApi.delete(`/vehicle-models/${id}`)

// ── Configuration moteur (responsable) ────────────────
export type OptimizationConfig = {
  clusterRadiusKm: number
  dateWindowDays: number
  availableTrucksOnly: boolean
}

export const getOptimizationConfig = () =>
  responsableApi.get<ApiResponse<OptimizationConfig>>('/optimization/config').then(r => r.data.data)

export const saveOptimizationConfig = (cfg: OptimizationConfig) =>
  responsableApi.put<ApiResponse<OptimizationConfig>>('/optimization/config', cfg).then(r => r.data.data)

// ── Incidents (lecture seule pour responsable) ────────
export const getIncidentsResponsable = (status?: string) =>
  operateurApi.get<ApiResponse<PageResult<Incident>>>('/incidents', { params: { status, size: 50 } })
    .then(r => r.data.data?.content ?? [])

// ── Supervision opérationnelle ────────────────────────
export const getOrderStatsSupervision = () =>
  operateurApi.get<ApiResponse<Record<string, number>>>('/orders/stats').then(r => r.data.data ?? {})

export const getTourneeStatsSupervision = () =>
  operateurApi.get<ApiResponse<Record<string, number>>>('/tournees/stats').then(r => r.data.data ?? {})

export const getRecentOrdersSupervision = (size = 15) =>
  operateurApi.get<ApiResponse<PageResult<Order>>>('/orders', { params: { size, page: 0 } })
    .then(r => r.data.data?.content ?? [])

export const getActiveTourneesSupervision = () =>
  operateurApi.get<ApiResponse<PageResult<Tournee>>>('/tournees', { params: { size: 20, page: 0 } })
    .then(r => r.data.data?.content ?? [])

// ── Lancer l'optimisation (opérateur via proxy nginx) ─
export const runOptimization = (orderIds: string[], clusterRadiusKm = 80, availableTrucksOnly = true) =>
  responsableApi.post<ApiResponse<OptimizationResult>>('/optimization/run', {
    orderIds,
    clusterRadiusKm,
    availableTrucksOnly,
  }).then(r => r.data.data)

// ── Dashboard stats ───────────────────────────────────
export const getResponsableDashboard = () =>
  responsableApi.get<ApiResponse<any>>('/dashboard/stats').then(r => r.data.data)

// Cancellations
export const getResponsableCancellations = () =>
  responsableApi.get<any[]>('/cancellations').then(r => r.data ?? [])

export const approveCancellation = (id: string) =>
  responsableApi.post<any>(`/cancellations/${id}/approve`).then(r => r.data)

export const rejectCancellation = (id: string, reason: string) =>
  responsableApi.post<any>(`/cancellations/${id}/reject`, { reason }).then(r => r.data)

export const downloadCancellationDocumentRespo = async (id: string, orderNumber?: string) => {
  const resp = await responsableApi.get(`/cancellations/${id}/document`, { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `annulation-${orderNumber ?? id}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
