import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { PageLoading } from '../components/ui/Loading'
import { ForbiddenPage } from '../pages/public/ForbiddenPage'
import type { AppRole } from '../types/auth'

/** Wajib login. Bila `roles` diberikan, pengguna harus memiliki minimal satu role tersebut. */
export function ProtectedRoute({ roles }: { roles?: AppRole[] }) {
  const { user, loading, hasRole } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoading label="Memeriksa sesi…" />
  if (!user) return <Navigate to="/masuk" replace state={{ from: location.pathname }} />
  if (roles && !hasRole(...roles)) return <ForbiddenPage />
  return <Outlet />
}
