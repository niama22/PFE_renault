import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/pages/auth/LoginPage'

// Admin
import DashboardPage from '@/pages/admin/DashboardPage'
import UsersPage from '@/pages/admin/UsersPage'
import AuditLogsPage from '@/pages/admin/AuditLogsPage'

// Operateur
import OperateurDashboardPage from '@/pages/operateur/DashboardPage'
import OperateurOrdersPage from '@/pages/operateur/OrdersPage'
import OperateurTourneesPage from '@/pages/operateur/TourneesPage'
import OperateurIncidentsPage from '@/pages/operateur/IncidentsPage'
import OperateurOptimizationPage from '@/pages/operateur/OptimizationPage'
import OperateurCancellationsPage from '@/pages/operateur/CancellationsPage'
import OperateurMessagesPage from '@/pages/operateur/MessagesPage'

// Client
import ClientOrdersPage from '@/pages/client/OrdersPage'
import ClientIncidentsPage from '@/pages/client/IncidentsPage'
import ClientProfilePage from '@/pages/client/ProfilePage'
import ClientCancellationsPage from '@/pages/client/CancellationsPage'

// Responsable
import ResponsableDashboardPage  from '@/pages/responsable/DashboardPage'
import ResponsableTourneesPage   from '@/pages/responsable/TourneesPage'
import ResponsableIncidentsPage  from '@/pages/responsable/IncidentsPage'
import ResponsableCancellationsPage from '@/pages/responsable/CancellationsPage'
import SupervisionPage           from '@/pages/responsable/SupervisionPage'
import TrucksPage                from '@/pages/responsable/TrucksPage'
import VehicleModelsPage         from '@/pages/responsable/VehicleModelsPage'
import OptimizationConfigPage    from '@/pages/responsable/OptimizationConfigPage'

function RootRedirect() {
  const { isAuthenticated, primaryRole } = useAuthStore()
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])

  if (!ready) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  const role = primaryRole()
  if (role === 'admin')       return <Navigate to="/admin/dashboard" replace />
  if (role === 'operateur')   return <Navigate to="/operateur/dashboard" replace />
  if (role === 'responsable') return <Navigate to="/responsable/dashboard" replace />
  if (role === 'client')      return <Navigate to="/client/orders" replace />
  if (role === 'chauffeur')   return <Navigate to="/chauffeur" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"    element={<DashboardPage />} />
        <Route path="users"        element={<UsersPage />} />
        <Route path="audit"        element={<AuditLogsPage />} />
      </Route>

      {/* Operateur */}
      <Route path="/operateur" element={
        <ProtectedRoute roles={['operateur']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"     element={<OperateurDashboardPage />} />
        <Route path="orders"        element={<OperateurOrdersPage />} />
        <Route path="tournees"      element={<OperateurTourneesPage />} />
        <Route path="incidents"     element={<OperateurIncidentsPage />} />
        <Route path="optimization"  element={<OperateurOptimizationPage />} />
        <Route path="cancellations" element={<OperateurCancellationsPage />} />
        <Route path="messages"      element={<OperateurMessagesPage />} />
      </Route>

      {/* Responsable */}
      <Route path="/responsable" element={
        <ProtectedRoute roles={['responsable']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"            element={<ResponsableDashboardPage />} />
        <Route path="supervision"          element={<SupervisionPage />} />
        <Route path="tournees"             element={<ResponsableTourneesPage />} />
        <Route path="incidents"            element={<ResponsableIncidentsPage />} />
        <Route path="cancellations"        element={<ResponsableCancellationsPage />} />
        <Route path="trucks"               element={<TrucksPage />} />
        <Route path="vehicle-models"       element={<VehicleModelsPage />} />
        <Route path="optimization-config"  element={<OptimizationConfigPage />} />
      </Route>

      {/* Client */}
      <Route path="/client" element={
        <ProtectedRoute roles={['client']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="orders" replace />} />
        <Route path="orders"        element={<ClientOrdersPage />} />
        <Route path="incidents"     element={<ClientIncidentsPage />} />
        <Route path="cancellations" element={<ClientCancellationsPage />} />
        <Route path="profile"       element={<ClientProfilePage />} />
      </Route>

      <Route path="/unauthorized" element={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-slate-400">Accès non autorisé</p>
        </div>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
