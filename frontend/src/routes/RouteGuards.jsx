import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import Loader from '../components/Loader'

/**
 * Route guard component restricting access to authenticated users with specific roles.
 */
export function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <Loader size="large" />
        <p className="mt-4 text-muted-foreground text-sm animate-pulse">Verifying secure session...</p>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    // Redirect to login page and store the route attempted for redirect-back on login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role.name)) {
    // User is authenticated but doesn't have the required role
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

/**
 * Route guard to dynamically redirect users to their role-specific dashboard.
 */
export function DashboardRedirect() {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <Loader size="large" />
        <p className="mt-4 text-muted-foreground text-sm animate-pulse">Verifying secure session...</p>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (user.role?.name === 'student') {
    return <Navigate to="/student/dashboard" replace />
  }

  if (user.role?.name === 'admin' || user.role?.name === 'super_admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  return <Navigate to="/unauthorized" replace />
}
