import { getJoinedStoreIds } from '@/api/mocks/staff/join'
import { findStaffStore } from '@/api/mocks/staff/stores'
import type { Me } from '@/lib/authStore'

// 가짜 데이터: GET /users/me (응답 모양 확정 11/4, docs/07 1-1) — BE 연결 전까지 사용.
// 소속 매장은 초대코드로 들어간 매장 (join.ts). 처음에는 없어서 역할 선택으로 간다

export function mockMe(user: Omit<Me, 'stores'>): Me {
  const stores = getJoinedStoreIds().map((storeId) => ({
    storeId,
    storeName: findStaffStore(storeId).name,
    role: 'staff' as const,
  }))
  return { ...user, stores }
}
