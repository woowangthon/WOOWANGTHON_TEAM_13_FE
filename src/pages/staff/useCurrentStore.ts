import { DEFAULT_STORE_ID, findStaffStore, staffStores } from '@/api/mocks/staff/stores'
import { useAuthStore } from '@/lib/authStore'
import { env } from '@/lib/env'
import { useStoreStore } from '@/lib/storeStore'
import { useStaffStore } from '@/pages/staff/staffStore'

/**
 * 지금 선택한 매장 + 소속 매장 목록 (n잡).
 * 목록은 GET /me 에서 알바로 들어간 매장만 (초대코드로 입장한 매장). 마이페이지에서 삭제한 매장은 빠진다.
 * VITE_SKIP_AUTH=true 로 로그인 없이 볼 때는 me 가 없어서 가짜 매장을 모두 보여 준다.
 */
export function useCurrentStore() {
  const currentStoreId = useStoreStore((state) => state.currentStoreId)
  const setCurrentStoreId = useStoreStore((state) => state.setCurrentStoreId)
  const removedStoreIds = useStaffStore((state) => state.removedStoreIds)
  const me = useAuthStore((state) => state.me)

  const joinedIds =
    env.skipAuth && !me
      ? null
      : (me?.stores ?? []).filter((s) => s.role === 'staff').map((s) => s.storeId)

  const stores = staffStores.filter(
    (store) =>
      (joinedIds === null || joinedIds.includes(store.id)) && !removedStoreIds.includes(store.id),
  )
  const active = stores.find((store) => store.id === currentStoreId)
  const store = active ?? stores[0] ?? findStaffStore(DEFAULT_STORE_ID)

  return { store, stores, setCurrentStoreId }
}
