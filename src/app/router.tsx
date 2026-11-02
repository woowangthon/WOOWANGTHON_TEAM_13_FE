import { createBrowserRouter, Navigate } from 'react-router'
import { RequireAuth, RequireRole } from '@/app/guards'
import { NotFoundPage } from '@/app/NotFoundPage'
import { authRoutes } from '@/pages/auth/routes'
import { ownerRoutes } from '@/pages/owner/routes'
import { staffRoutes } from '@/pages/staff/routes'

/*
 * 전체 라우터 — 담당: 민지 (첫날 이후 거의 바꾸지 않는다)
 * 화면 주소는 각자 routes.tsx 에서만 추가한다.
 *   공통 /login /auth/callback /role  → pages/auth/routes.tsx (민지)
 *   알바 /staff/...                    → pages/staff/routes.tsx (민지)
 *   사장 /owner/...                    → pages/owner/routes.tsx (나현)
 */
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  ...authRoutes,
  {
    element: <RequireAuth />,
    children: [
      { element: <RequireRole role="staff" />, children: staffRoutes },
      { element: <RequireRole role="owner" />, children: ownerRoutes },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
