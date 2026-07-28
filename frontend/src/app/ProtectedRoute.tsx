import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { useAuth } from './AuthContext'

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50" role="status">
        <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" aria-hidden="true" />
        <span className="sr-only">Loading application</span>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  return <Outlet />
}
