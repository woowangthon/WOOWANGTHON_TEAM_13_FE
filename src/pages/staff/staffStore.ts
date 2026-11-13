import { create } from 'zustand'
import { staffStores } from '@/api/mocks/staff/stores'

/*
 * 알바생 화면 상태 (BE 연결 전 시연용) — 화면을 옮겨 다녀도 제출 전 내용이 유지된다.
 * 채팅 · 인수인계 · 근무 · 급여는 src/lib/api 훅(assistantChat · handover · schedule · payroll)으로 옮겼다.
 * BE 가 준비되면 이 상태들은 TanStack Query(서버 데이터)로 바꾼다.
 */

interface StaffState {
  profileName: string
  /** 마이페이지에서 삭제한 매장 */
  removedStoreIds: string[]

  setProfileName: (name: string) => void
  removeStore: (storeId: string) => void
  restoreStoreByCode: (code: string) => string | null
}

export const useStaffStore = create<StaffState>((set, get) => {
  return {
    profileName: '지은',
    removedStoreIds: [],

    setProfileName: (profileName) => set({ profileName }),

    removeStore: (storeId) =>
      set((state) => ({ removedStoreIds: [...state.removedStoreIds, storeId] })),

    restoreStoreByCode: (code) => {
      const store = staffStores.find((s) => s.code === code && get().removedStoreIds.includes(s.id))
      if (!store) return null
      set((state) => ({ removedStoreIds: state.removedStoreIds.filter((id) => id !== store.id) }))
      return store.id
    },
  }
})
