import { create } from 'zustand'
import { initialPaySettings, type PaySettings } from '@/api/mocks/staff/payroll'
import {
  initialAvailability,
  initialAvailabilityMemo,
  type AvailabilityMark,
} from '@/api/mocks/staff/schedule'
import { staffStores } from '@/api/mocks/staff/stores'

/*
 * 알바생 화면 상태 (BE 연결 전 시연용) — 화면을 옮겨 다녀도 제출 내용이 유지된다.
 * 채팅 · 인수인계는 src/lib/api 훅(assistantChat · handover)으로 옮겼다.
 * BE 가 준비되면 이 상태들은 TanStack Query(서버 데이터)로 바꾼다.
 */

interface StaffState {
  profileName: string
  /** 마이페이지에서 삭제한 매장 */
  removedStoreIds: string[]
  availability: Record<number, AvailabilityMark>
  availabilityMemo: string
  availabilitySubmitted: boolean
  paySettings: Record<string, PaySettings>

  setProfileName: (name: string) => void
  removeStore: (storeId: string) => void
  restoreStoreByCode: (code: string) => string | null
  cycleAvailability: (day: number) => void
  setAvailabilityMemo: (memo: string) => void
  submitAvailability: () => void
  savePaySettings: (storeId: string, settings: PaySettings) => void
}

export const useStaffStore = create<StaffState>((set, get) => {
  return {
    profileName: '지은',
    removedStoreIds: [],
    availability: initialAvailability,
    availabilityMemo: initialAvailabilityMemo,
    availabilitySubmitted: false,
    paySettings: initialPaySettings,

    setProfileName: (profileName) => set({ profileName }),

    removeStore: (storeId) =>
      set((state) => ({ removedStoreIds: [...state.removedStoreIds, storeId] })),

    restoreStoreByCode: (code) => {
      const store = staffStores.find((s) => s.code === code && get().removedStoreIds.includes(s.id))
      if (!store) return null
      set((state) => ({ removedStoreIds: state.removedStoreIds.filter((id) => id !== store.id) }))
      return store.id
    },

    cycleAvailability: (day) =>
      set((state) => ({
        availability: {
          ...state.availability,
          [day]: (((state.availability[day] ?? 0) + 1) % 3) as AvailabilityMark,
        },
      })),

    setAvailabilityMemo: (availabilityMemo) => set({ availabilityMemo }),

    submitAvailability: () => set({ availabilitySubmitted: true }),

    savePaySettings: (storeId, settings) =>
      set((state) => ({ paySettings: { ...state.paySettings, [storeId]: settings } })),
  }
})
