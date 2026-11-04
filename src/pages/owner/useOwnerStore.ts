import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ownerToday } from '@/api/mocks/owner/api'
import { useOwnerStores } from '@/pages/owner/api/stores'
import type { OwnerStore } from '@/pages/owner/api/types'
import { STORE_THEME, themeOf, type StoreThemeColors } from '@/shared/storeTheme'
import type { StoreTheme } from '@/lib/api/types'

/*
 * 사장님 화면의 지금 매장 — 담당: 나현
 * 알바 화면(useStoreStore)과 따로 기억한다: 한 사람이 사장님 · 알바생을 같이 할 수 있어서.
 */

interface OwnerUiState {
  currentStoreId: string | null
  setCurrentStoreId: (storeId: string | null) => void
}

const useOwnerUiStore = create<OwnerUiState>()(
  persist(
    (set) => ({
      currentStoreId: null,
      setCurrentStoreId: (currentStoreId) => set({ currentStoreId }),
    }),
    { name: 'owner-current-store' },
  ),
)

export interface OwnerStoreView extends OwnerStore, StoreThemeColors {
  icon: StoreTheme
}

const EMPTY_STORE: OwnerStoreView = {
  storeId: '',
  name: '',
  kind: '',
  address: '',
  theme: null,
  photoUrl: null,
  payday: 10,
  size: 'under5',
  bizNo: null,
  staffCount: 0,
  icon: 'moon',
  ...STORE_THEME.moon,
}

/** 지금 매장 + 내 매장 목록. 매장 색은 테마(없으면 매장 순서대로) */
export function useOwnerStore() {
  const currentStoreId = useOwnerUiStore((state) => state.currentStoreId)
  const setCurrentStoreId = useOwnerUiStore((state) => state.setCurrentStoreId)
  const query = useOwnerStores()
  const data = query.data

  const stores = useMemo<OwnerStoreView[]>(
    () =>
      (data?.stores ?? []).map((store, index) => {
        const icon = themeOf(store.theme, index)
        return { ...store, icon, ...STORE_THEME[icon] }
      }),
    [data],
  )
  const store = stores.find((s) => s.storeId === currentStoreId) ?? stores[0] ?? EMPTY_STORE

  return {
    store,
    stores,
    setCurrentStoreId,
    isPending: query.isPending,
    error: query.error,
    retry: () => query.refetch(),
    /** 시연 기준 오늘 (서버 시간) */
    today: ownerToday(),
  }
}
