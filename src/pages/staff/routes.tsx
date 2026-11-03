import type { RouteObject } from 'react-router'
import AvailabilityPage from '@/pages/staff/schedule/AvailabilityPage'
import ChatPage from '@/pages/staff/chat/ChatPage'
import HandoverPage from '@/pages/staff/handover/HandoverPage'
import JoinPage from '@/pages/staff/join/JoinPage'
import ManualDetailPage from '@/pages/staff/manual/ManualDetailPage'
import ManualListPage from '@/pages/staff/manual/ManualListPage'
import MyPage from '@/pages/staff/me/MyPage'
import StoreSettingsPage from '@/pages/staff/me/StoreSettingsPage'
import MySchedulePage from '@/pages/staff/schedule/MySchedulePage'
import PayrollPage from '@/pages/staff/payroll/PayrollPage'
import RecipeBoardPage from '@/pages/staff/recipe/RecipeBoardPage'
import RecipeDetailPage from '@/pages/staff/recipe/RecipeDetailPage'
import StaffHomePage from '@/pages/staff/home/StaffHomePage'
import StaffLayout from '@/pages/staff/StaffLayout'

// 알바 화면 주소 — 담당: 민지
export const staffRoutes: RouteObject[] = [
  { path: '/staff/join', element: <JoinPage /> },
  // 하단 탭 없이 전체 화면으로 보이는 하위 화면 (디자인 알바생 v3)
  { path: '/staff/me', element: <MyPage /> },
  { path: '/staff/stores/:storeId', element: <StoreSettingsPage /> },
  {
    path: '/staff',
    element: <StaffLayout />,
    children: [
      { index: true, element: <StaffHomePage /> },
      { path: 'recipes', element: <RecipeBoardPage /> },
      { path: 'recipes/:recipeId', element: <RecipeDetailPage /> },
      { path: 'manuals', element: <ManualListPage /> },
      { path: 'manuals/:manualId', element: <ManualDetailPage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'handover', element: <HandoverPage /> },
      { path: 'availability', element: <AvailabilityPage /> },
      { path: 'schedule', element: <MySchedulePage /> },
      { path: 'payroll', element: <PayrollPage /> },
    ],
  },
]
