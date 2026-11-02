import type { RouteObject } from 'react-router'
import LoginPage from '@/pages/auth/LoginPage'
import OAuthCallbackPage from '@/pages/auth/OAuthCallbackPage'
import RoleSelectPage from '@/pages/auth/RoleSelectPage'

// 공통 화면 주소 — 담당: 민지
export const authRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/auth/callback', element: <OAuthCallbackPage /> },
  { path: '/role', element: <RoleSelectPage /> },
]
