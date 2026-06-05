import { clientApi, adminApi } from '@/lib/axios'
import type { ClientIncident, VehicleType, ApiResponse } from '@/types'

export const getMyOrders = () =>
  clientApi.get<ApiResponse<any[]>>('/orders').then(r => r.data.data)

export const createOrder = (data: {
  vehicles: Array<{ vehicleModelId?: string; vehicleModelLabel?: string; quantity: number }>
  requestedDeliveryDate: string
  deliveryAddress: { street: string; city: string; postalCode: string; country: string }
}) => clientApi.post<ApiResponse<any>>('/orders', data).then(r => r.data.data)

export const getActiveVehicleTypes = () =>
  adminApi.get<ApiResponse<VehicleType[]>>('/vehicle-types/active').then(r => r.data.data ?? [])

export const requestOrderCancellation = (
  orderId: string,
  reason: string,
  vehicleChassisIds?: string[],
) => clientApi.post<ApiResponse<any>>(`/orders/${orderId}/cancel`, { reason, vehicleChassisIds })
     .then(r => r.data)

export const getMyIncidents = () =>
  clientApi.get<ApiResponse<ClientIncident[]>>('/incidents').then(r => r.data.data)

export const createIncident = (data: {
  orderId?: string
  description: string
  severity: string
}) => clientApi.post<ApiResponse<ClientIncident>>('/incidents', data).then(r => r.data.data)
