import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/*
 * 현재 선택한 매장 — 담당: 민지
 * n잡: 알바생이 여러 매장에 소속되면 상단 매장 전환(shared/store/StoreSwitcher)으로 바꾼다.
 * 매뉴얼 · 레시피 · 채팅 · 인수인계 · 근무는 모두 이 매장 기준으로 불러온다.
 */

interface StoreState {
  currentStoreId: string | null
  setCurrentStoreId: (storeId: string | null) => void
}

export const useStoreStore = create<StoreState>()(
  persist(
    (set) => ({
      currentStoreId: null,
      setCurrentStoreId: (storeId) => set({ currentStoreId: storeId }),
    }),
    { name: 'current-store' },
  ),
)
