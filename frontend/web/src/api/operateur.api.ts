import { operateurApi } from '@/lib/axios'
import type { Order, Tournee, Incident, ApiResponse, PageResult, OptimizationResult, ProposedTournee, ConfirmedTourneeDto } from '@/types'

// Orders
export const getOrders = (page = 0, size = 20, status?: string) =>
  operateurApi.get<ApiResponse<PageResult<Order>>>('/orders', { params: { status, page, size } }).then(r => r.data.data)

export const getOrderById = (id: string) =>
  operateurApi.get<ApiResponse<Order>>(`/orders/${id}`).then(r => r.data.data)

export const validateOrder = (id: string, notes?: string) =>
  operateurApi.post<ApiResponse<Order>>(`/orders/${id}/validate`, { notes }).then(r => r.data.data)

export const rejectOrder = (id: string, reason: string) =>
  operateurApi.post<ApiResponse<Order>>(`/orders/${id}/reject`, { reason }).then(r => r.data.data)

// Tournées
export const getTournees = (status?: string) =>
  operateurApi.get<ApiResponse<PageResult<Tournee>>>('/tournees', { params: { status } })
    .then(r => r.data.data?.content ?? [])

export const createTournee = (data: {
  vehicleTypeId: string
  plannedDate: string
  notes?: string
}) => operateurApi.post<ApiResponse<Tournee>>('/tournees', data).then(r => r.data.data)

export const assignChauffeur = (id: string, data: { chauffeurId: string; chauffeurName: string }) =>
  operateurApi.patch<ApiResponse<Tournee>>(`/tournees/${id}/assign-chauffeur`, data).then(r => r.data.data)

export const submitTournee = (id: string) =>
  operateurApi.patch<ApiResponse<Tournee>>(`/tournees/${id}/submit`).then(r => r.data.data)

// Incidents
export const getIncidents = (status?: string) =>
  operateurApi.get<ApiResponse<PageResult<Incident>>>('/incidents', { params: { status } })
    .then(r => r.data.data?.content ?? [])

export const takeIncident = (id: string) =>
  operateurApi.patch<ApiResponse<Incident>>(`/incidents/${id}/take`).then(r => r.data.data)

export const resolveIncident = (id: string, resolutionNotes: string) =>
  operateurApi.patch<ApiResponse<Incident>>(`/incidents/${id}/resolve`, { response: resolutionNotes }).then(r => r.data.data)

export const closeIncident = (id: string) =>
  operateurApi.post<ApiResponse<Incident>>(`/incidents/${id}/close`).then(r => r.data.data)

// Optimisation (moteur dans responsable-service, accessible par opérateur via nginx)
export const getOptimizationConfigOperateur = () =>
  operateurApi.get<ApiResponse<{ clusterRadiusKm: number; dateWindowDays: number; availableTrucksOnly: boolean }>>('/optimization/config')
    .then(r => r.data.data)

export const runOptimizationOperateur = (params?: { clusterRadiusKm?: number; dateWindowDays?: number; availableTrucksOnly?: boolean; orderIds?: string[] }) =>
  operateurApi.post<ApiResponse<OptimizationResult>>('/optimization/run', params ?? {})
    .then(r => r.data.data)

export const updateOrder = (id: string, data: {
  requestedDeliveryDate?: string
  deliveryAddressJson?: string
  vehiclesJson?: string
  operatorNotes?: string
}) => operateurApi.patch<ApiResponse<Order>>(`/orders/${id}`, data).then(r => r.data.data)

export const confirmPlanningOperateur = (proposed: ProposedTournee[], operatorNotes?: string) =>
  operateurApi.post<ApiResponse<ConfirmedTourneeDto[]>>('/optimization/confirm', {
    proposedTournees: proposed,
    operatorNotes,
  }).then(r => r.data.data)

// Stats dashboard
export const getOrderStats   = () => operateurApi.get<ApiResponse<Record<string,number>>>('/orders/stats').then(r => r.data.data ?? {})
export const getTourneeStats = () => operateurApi.get<ApiResponse<Record<string,number>>>('/tournees/stats').then(r => r.data.data ?? {})
export const getRecentOrders = () => operateurApi.get<ApiResponse<PageResult<Order>>>('/orders', { params: { page:0, size:6 } }).then(r => r.data.data?.content ?? [])

// Messages chauffeur ↔ opérateur
export type OMessage = {
  id: string
  missionId: string
  chauffeurId?: string
  chauffeurName?: string
  sender: 'CHAUFFEUR' | 'OPERATEUR'
  senderName: string
  content: string
  readByOperator: boolean
  createdAt: string
}

export const getMessageThreads = () =>
  operateurApi.get<ApiResponse<OMessage[]>>('/messages/threads').then(r => r.data.data ?? [])

export const getMessageThread = (missionId: string) =>
  operateurApi.get<ApiResponse<OMessage[]>>(`/messages/mission/${missionId}`).then(r => r.data.data ?? [])

export const replyToDriver = (missionId: string, content: string, chauffeurId?: string) =>
  operateurApi.post<ApiResponse<OMessage>>(`/messages/mission/${missionId}/reply`, { content, chauffeurId }).then(r => r.data.data)

export const markThreadRead = (missionId: string) =>
  operateurApi.post(`/messages/mission/${missionId}/read`)

export const getUnreadCount = (missionId: string) =>
  operateurApi.get<ApiResponse<number>>(`/messages/mission/${missionId}/unread`).then(r => r.data.data ?? 0)

// Cancellations
export const getCancellations = () =>
  operateurApi.get<ApiResponse<any[]>>('/cancellations').then(r => r.data.data ?? [])

export const forwardCancellation = (id: string) =>
  operateurApi.post<ApiResponse<any>>(`/cancellations/${id}/forward`).then(r => r.data.data)

export const downloadCancellationDocument = async (id: string, orderNumber?: string) => {
  const resp = await operateurApi.get(`/cancellations/${id}/document`, { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `annulation-${orderNumber ?? id}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
