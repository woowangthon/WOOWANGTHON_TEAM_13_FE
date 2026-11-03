import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore, type StoreRole } from '@/lib/authStore'
import { env } from '@/lib/env'
import { Spinner } from '@/ui/Spinner'

/*
 * 화면 보호 — 담당: 민지
 * VITE_SKIP_AUTH=true 이면 로그인 없이 모든 화면을 볼 수 있다 (BE 연결 전 로컬 개발용).
 */

export function RequireAuth() {
  const isReady = useAuthStore((state) => state.isReady)
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const location = useLocation()
  if (env.skipAuth) return <Outlet />
  // me 까지 불러온 뒤에 역할을 확인해야 하므로 준비가 끝날 때까지 기다린다
  if (!isReady) return <Spinner className="min-h-dvh items-center" />
  if (isLoggedIn) return <Outlet />
  // 로그인 뒤 원래 가려던 화면(초대 링크 등)으로 돌아올 수 있게 넘긴다
  return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
}

export function RequireRole({ role }: { role: StoreRole }) {
  const me = useAuthStore((state) => state.me)
  const pendingRole = useAuthStore((state) => state.pendingRole)
  if (env.skipAuth) return <Outlet />
  // 역할 선택에서 고른 역할(pendingRole)은 매장 입장 · 생성 전이라도 통과
  const hasRole = me?.stores.some((store) => store.role === role) || pendingRole === role
  if (hasRole) return <Outlet />
  return <Navigate to="/role" replace />
}
