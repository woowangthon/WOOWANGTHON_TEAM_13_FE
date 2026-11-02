import { Navigate, Outlet } from 'react-router'
import { useAuthStore, type StoreRole } from '@/lib/authStore'
import { env } from '@/lib/env'

/*
 * 화면 보호 — 담당: 민지
 * VITE_SKIP_AUTH=true 이면 로그인 없이 모든 화면을 볼 수 있다 (BE 연결 전 로컬 개발용).
 */

export function RequireAuth() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  if (env.skipAuth || isLoggedIn) return <Outlet />
  return <Navigate to="/login" replace />
}

export function RequireRole({ role }: { role: StoreRole }) {
  const me = useAuthStore((state) => state.me)
  if (env.skipAuth) return <Outlet />
  const hasRole = me?.stores.some((store) => store.role === role)
  if (hasRole) return <Outlet />
  return <Navigate to="/role" replace />
}
