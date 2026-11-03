import { DEFAULT_STORE_ID, findStaffStore, staffStores } from '@/api/mocks/staff/stores'
import { useStoreStore } from '@/lib/storeStore'
import { useStaffStore } from '@/pages/staff/staffStore'

/** 지금 선택한 매장 + 소속 매장 목록 (n잡). 삭제한 매장은 빠진다 */
export function useCurrentStore() {
  const currentStoreId = useStoreStore((state) => state.currentStoreId)
  const setCurrentStoreId = useStoreStore((state) => state.setCurrentStoreId)
  const removedStoreIds = useStaffStore((state) => state.removedStoreIds)

  const stores = staffStores.filter((store) => !removedStoreIds.includes(store.id))
  const active = stores.find((store) => store.id === currentStoreId)
  const store = active ?? stores[0] ?? findStaffStore(DEFAULT_STORE_ID)

  return { store, stores, setCurrentStoreId }
}
