import type { RouteObject } from 'react-router'
import BizVerifyPage from '@/pages/owner/store/BizVerifyPage'
import ManualEditPage from '@/pages/owner/manual/ManualEditPage'
import ManualManagePage from '@/pages/owner/manual/ManualManagePage'
import MemberAddPage from '@/pages/owner/members/MemberAddPage'
import MemberDetailPage from '@/pages/owner/members/MemberDetailPage'
import MemberListPage from '@/pages/owner/members/MemberListPage'
import OwnerHandoverPage from '@/pages/owner/handover/OwnerHandoverPage'
import OwnerHomePage from '@/pages/owner/home/OwnerHomePage'
import OwnerLayout from '@/pages/owner/OwnerLayout'
import OwnerPayrollPage from '@/pages/owner/payroll/OwnerPayrollPage'
import RecipeEditPage from '@/pages/owner/recipe/RecipeEditPage'
import RecipeManagePage from '@/pages/owner/recipe/RecipeManagePage'
import RecipeScanPage from '@/pages/owner/recipe/RecipeScanPage'
import ScheduleDraftPage from '@/pages/owner/schedule/ScheduleDraftPage'
import StaffingPage from '@/pages/owner/schedule/StaffingPage'
import StoreCreatePage from '@/pages/owner/store/StoreCreatePage'

// 사장 화면 주소 — 담당: 나현
export const ownerRoutes: RouteObject[] = [
  {
    path: '/owner',
    element: <OwnerLayout />,
    children: [
      { index: true, element: <OwnerHomePage /> },
      { path: 'store/new', element: <StoreCreatePage /> },
      { path: 'store/verify', element: <BizVerifyPage /> },
      { path: 'members', element: <MemberListPage /> },
      { path: 'members/new', element: <MemberAddPage /> },
      { path: 'members/:memberId', element: <MemberDetailPage /> },
      { path: 'manuals', element: <ManualManagePage /> },
      { path: 'manuals/new', element: <ManualEditPage /> },
      { path: 'manuals/:manualId', element: <ManualEditPage /> },
      { path: 'recipes', element: <RecipeManagePage /> },
      { path: 'recipes/new', element: <RecipeEditPage /> },
      { path: 'recipes/scan', element: <RecipeScanPage /> },
      { path: 'recipes/:recipeId', element: <RecipeEditPage /> },
      { path: 'handover', element: <OwnerHandoverPage /> },
      { path: 'staffing', element: <StaffingPage /> },
      { path: 'schedule', element: <ScheduleDraftPage /> },
      { path: 'payroll', element: <OwnerPayrollPage /> },
    ],
  },
]
