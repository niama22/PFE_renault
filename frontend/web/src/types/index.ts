export type Role = 'admin' | 'operateur' | 'client' | 'responsable' | 'chauffeur'

export interface AuthUser {
  keycloakId: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  roles: Role[]
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export interface PageResult<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

// ── Admin ──────────────────────────────────────────────
export interface DashboardStats {
  orders: {
    total: number
    pending: number
    validated: number
    rejected: number
    planned: number
    inTransit: number
    delivered: number
  }
  incidents: {
    total: number
    open: number
    inProgress: number
    resolved: number
  }
  tournees: {
    pendingValidation: number
    validated: number
    inProgress: number
    completed: number
  }
  totalUsers: number
  updatedAt: string
}

export interface KeycloakUser {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  enabled: boolean
  roles?: string[]
  realmRoles?: string[]
  createdTimestamp?: number
}

export interface VehicleType {
  id: number
  name: string
  description?: string
  maxWeightKg?: number
  maxVolumeM3?: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface AuditLog {
  id: number
  eventType: string
  entityType: string
  entityId: string
  actorId: string
  actorRole: string
  details: string
  createdAt: string
}

// ── Operateur ─────────────────────────────────────────
export type OrderStatus =
  | 'PENDING_VALIDATION' | 'VALIDATED' | 'REJECTED'
  | 'PLANNED' | 'IN_PROGRESS' | 'IN_TRANSIT' | 'DELIVERED'

/** Un châssis commandé — remplace l'ancien format { vehicleModelId, quantity }. */
export interface ChassisItem {
  chassisId: string
  vehicleModelId?: string
  vehicleModelLabel?: string
}

export interface Order {
  id: string
  clientId: string
  clientCode?: string
  clientName?: string
  orderNumber?: string
  status: OrderStatus
  deliveryAddress?: Record<string, string>
  weightKg?: number
  volumeM3?: number
  vehicles?: ChassisItem[]
  requestedDeliveryDate?: string
  estimatedArrivalDate?: string
  operatorNotes?: string
  rejectionReason?: string
  tourneeId?: string
  createdAt: string
  updatedAt: string
}

export type TourneeStatus =
  | 'DRAFT' | 'ASSIGNED' | 'PENDING_RESPONSABLE_VALIDATION'
  | 'VALIDATED' | 'IN_PROGRESS' | 'COMPLETED'

export interface Tournee {
  id: string
  tourneeNumber?: string
  status: TourneeStatus
  chauffeurId?: string
  chauffeurName?: string
  plannedDate: string
  vehicleTypeId?: string
  vehicleTypeName?: string
  orderIds?: string[]
  orderIdsJson?: string
  operatorId?: string
  operatorNotes?: string
  responsableId?: string
  rejectionReason?: string
  validatedAt?: string
  truckId?: string
  truckPlate?: string
  truckLabel?: string
  stops?: DeliveryStop[]
  fillRatePercent?: number
  estimatedDistanceKm?: number
  createdAt: string
  updatedAt: string
}

// ── Responsable — Flotte & Optimisation ───────────────
export type TruckStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE'

export interface Truck {
  id: string
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
  status: TruckStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface VehicleModel {
  id: string
  brand: string
  model: string
  lengthCm: number
  widthCm: number
  heightCm: number
  weightKg: number
  active: boolean
  description?: string
  createdAt: string
  updatedAt: string
}

export interface DeliveryStop {
  sequence: number
  orderId: string
  /** All order IDs at this stop — multiple orders at the same address are merged into one stop. */
  orderIds?: string[]
  address: string
  city?: string
  lat?: number
  lng?: number
  vehicleModelLabel: string
  chassisIds?: string[]
  quantity: number
  weightKg: number
  volumeM3: number
}

export interface ProposedTournee {
  truckId: string
  truckPlate: string
  truckLabel: string
  truckMaxWeightKg: number
  truckMaxVolumeM3: number
  plannedDate?: string
  stops: DeliveryStop[]
  totalWeightKg: number
  totalVolumeM3: number
  fillRatePercent: number
  estimatedDistanceKm: number
  totalOrders: number
}

export interface ConfirmedTourneeDto {
  id: string
  tourneeNumber: string
  truckPlate: string
  truckLabel: string
  plannedDate: string
  orderCount: number
  fillRatePercent: number
  estimatedDistanceKm: number
  status: string
}

export interface OptimizationResult {
  proposedTournees: ProposedTournee[]
  unscheduledOrderIds: string[]
  totalOrders: number
  scheduledOrders: number
  averageFillRate: number
  message: string
}

export interface ResponsableStats {
  pendingValidation: number
  validated: number
  inProgress: number
  completed: number
  draft: number
  assigned: number
  validatedToday: number
  total: number
}

export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface Incident {
  id: string
  clientId?: string
  orderId?: string
  title?: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  resolutionNotes?: string
  response?: string
  operatorResponse?: string
  createdAt: string
  updatedAt: string
}

// ── Client ────────────────────────────────────────────
export interface ClientOrder {
  id: string
  orderNumber?: string
  status: OrderStatus
  deliveryAddress?: string | Record<string, string>
  weightKg?: number
  volumeM3?: number
  vehicles?: ChassisItem[]
  requestedDeliveryDate?: string
  estimatedArrivalDate?: string
  createdAt: string
}

export interface ClientIncident {
  id: string
  orderId?: string
  title?: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  resolutionNotes?: string
  response?: string
  operatorResponse?: string
  createdAt: string
}
