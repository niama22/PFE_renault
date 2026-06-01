import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import type { Role } from '@/types'

interface Props {
  children: React.ReactNode
  roles?: Role[]
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { isAuthenticated, user } = useAuthStore()
  // useEffect runs after paint, which is always after Zustand's async localStorage read.
  // So by the time ready=true, isAuthenticated reflects the real persisted value.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  if (!ready) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (roles && user) {
    const ok = roles.some(r => user.roles.includes(r))
    if (!ok) return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
