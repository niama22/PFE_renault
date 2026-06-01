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

export const startDelivery = (id: string) =>
  operateurApi.patch<ApiResponse<Tournee>>(`/tournees/${id}/start`).then(r => r.data.data)
