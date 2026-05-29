import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  hydrateFromStorage,
  selectIsAuthenticated,
  selectIsLoading,
  selectRole,
} from '../store/slices/authSlice.js'

export function ProtectedRoute({ allowedRoles }) {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isLoading = useSelector(selectIsLoading)
  const role = useSelector(selectRole)

  useEffect(() => {
    dispatch(hydrateFromStorage())
  }, [dispatch])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading MiniGate…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}

export function PublicRoute() {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isLoading = useSelector(selectIsLoading)
  const role = useSelector(selectRole)

  useEffect(() => {
    dispatch(hydrateFromStorage())
  }, [dispatch])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isAuthenticated && role) {
    const map = {
      'super-admin':       '/admin/platform',
      'society-admin':     '/society/dashboard',
      accountant:          '/accountant/dashboard',
      resident:            '/resident/dashboard',
      'security-guard':    '/guard/dashboard',
      'maintenance-staff': '/maintenance/dashboard',
      'support-staff':     '/support/dashboard',
      'delivery-partner':  '/delivery-partner/dashboard',
      'delivery':          '/delivery-partner/dashboard',
      'guest-user':        '/guest-user/access-pass',
      'guest':             '/guest-user/access-pass',
    }
    return <Navigate to={map[role] || '/society/dashboard'} replace />
  }

  return <Outlet />
}
