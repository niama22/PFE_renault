import { adminApi } from '@/lib/axios'
import type { DashboardStats, KeycloakUser, VehicleType, AuditLog, ApiResponse } from '@/types'

// Stats
export const getDashboard = () =>
  adminApi.get<ApiResponse<DashboardStats>>('/stats/dashboard').then(r => r.data.data)

// Users
export const getUsers = (role?: string, page = 0, size = 20) =>
  adminApi.get<ApiResponse<KeycloakUser[]>>('/users', { params: { role, page, size } }).then(r => r.data.data)

export const getUsersByRole = (role: string) =>
  adminApi.get<ApiResponse<KeycloakUser[]>>(`/users/by-role/${role}`).then(r => r.data.data ?? [])

export const getUserById = (id: string) =>
  adminApi.get<ApiResponse<KeycloakUser>>(`/users/${id}`).then(r => r.data.data)

export const createUser = (data: {
  username: string; email: string; firstName: string; lastName: string
  password: string; role: string; phone?: string; company?: string
}) => adminApi.post<ApiResponse<KeycloakUser>>('/users', data).then(r => r.data.data)

export const updateUser = (id: string, data: Partial<KeycloakUser>) =>
  adminApi.put<ApiResponse<KeycloakUser>>(`/users/${id}`, data).then(r => r.data.data)

export const resetPassword = (id: string) =>
  adminApi.post(`/users/${id}/send-reset-email`)

export const disableUser = (id: string) => adminApi.patch(`/users/${id}/disable`)
export const enableUser  = (id: string) => adminApi.patch(`/users/${id}/enable`)

// Vehicle types
export const getVehicleTypes = () =>
  adminApi.get<ApiResponse<VehicleType[]>>('/vehicle-types').then(r => r.data.data)

export const createVehicleType = (data: { name: string; description?: string; maxWeightKg?: number; maxVolumeM3?: number }) =>
  adminApi.post<ApiResponse<VehicleType>>('/vehicle-types', data).then(r => r.data.data)

export const updateVehicleType = (id: number, data: { name: string; description?: string; maxWeightKg?: number; maxVolumeM3?: number }) =>
  adminApi.put<ApiResponse<VehicleType>>(`/vehicle-types/${id}`, data).then(r => r.data.data)

export const deactivateVehicleType = (id: number) => adminApi.post(`/vehicle-types/${id}/deactivate`)
export const activateVehicleType   = (id: number) => adminApi.post(`/vehicle-types/${id}/activate`)

// Audit logs
export const getAuditLogs = (page = 0, size = 20) =>
  adminApi.get<ApiResponse<{ content: AuditLog[]; totalElements: number; totalPages: number }>>('/audit', { params: { page, size } }).then(r => r.data.data)

export const getAuditByEvent = (eventType: string) =>
  adminApi.get<ApiResponse<AuditLog[]>>(`/audit/event/${eventType}`).then(r => r.data.data)
