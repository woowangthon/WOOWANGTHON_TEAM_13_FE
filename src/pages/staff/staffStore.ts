import { create } from 'zustand'
import { initialChats, mockAnswer, OWNER_ANSWER, type ChatMessage } from '@/api/mocks/staff/chat'
import { initialPaySettings, type PaySettings } from '@/api/mocks/staff/payroll'
import {
  initialAvailability,
  initialAvailabilityMemo,
  type AvailabilityMark,
} from '@/api/mocks/staff/schedule'
import { staffStores } from '@/api/mocks/staff/stores'

/*
 * 알바생 화면 상태 (BE 연결 전 시연용) — 화면을 옮겨 다녀도 채팅 · 체크 · 제출 내용이 유지된다.
 * BE 가 준비되면 이 상태들은 TanStack Query(서버 데이터)로 바꾼다.
 */

interface StaffState {
  profileName: string
  /** 마이페이지에서 삭제한 매장 */
  removedStoreIds: string[]
  chats: Record<string, ChatMessage[]>
  /** 사장님 답변이 매뉴얼에 추가됐는지 (우산 시연 흐름) */
  umbrellaAdded: boolean
  /** 오늘 인수인계 체크 */
  checkedHandovers: Record<string, boolean>
  availability: Record<number, AvailabilityMark>
  availabilityMemo: string
  availabilitySubmitted: boolean
  paySettings: Record<string, PaySettings>

  setProfileName: (name: string) => void
  removeStore: (storeId: string) => void
  restoreStoreByCode: (code: string) => string | null
  sendQuestion: (storeId: string, text: string) => void
  askOwner: (storeId: string) => void
  toggleHandover: (id: string) => void
  cycleAvailability: (day: number) => void
  setAvailabilityMemo: (memo: string) => void
  submitAvailability: () => void
  savePaySettings: (storeId: string, settings: PaySettings) => void
}

export const useStaffStore = create<StaffState>((set, get) => {
  const push = (storeId: string, ...messages: ChatMessage[]) =>
    set((state) => ({
      chats: { ...state.chats, [storeId]: [...(state.chats[storeId] ?? []), ...messages] },
    }))

  return {
    profileName: '지은',
    removedStoreIds: [],
    chats: initialChats,
    umbrellaAdded: false,
    checkedHandovers: {},
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

    sendQuestion: (storeId, text) => {
      const question = text.trim()
      if (!question) return
      push(storeId, { who: 'me', text: question }, { who: 'typing' })
      setTimeout(() => {
        const answer = mockAnswer(storeId, question, get().umbrellaAdded)
        set((state) => ({
          chats: {
            ...state.chats,
            [storeId]: [...state.chats[storeId].filter((m) => m.who !== 'typing'), answer],
          },
        }))
      }, 800)
    },

    askOwner: (storeId) => {
      set((state) => ({
        chats: {
          ...state.chats,
          [storeId]: [
            ...state.chats[storeId].map((m) =>
              m.who === 'ai' && m.askOwner ? { ...m, askOwner: false, asked: true } : m,
            ),
            { who: 'system', text: '사장님께 전달했어요' },
          ],
        },
      }))
      // 시연: 달빛 카페는 사장님이 잠시 뒤 답하고, 답이 매뉴얼에 추가된다
      if (storeId === 'dalbit') {
        setTimeout(() => {
          push(
            'dalbit',
            { who: 'owner', text: OWNER_ANSWER },
            { who: 'system', text: '매뉴얼에 추가했어요' },
          )
          set({ umbrellaAdded: true })
        }, 2600)
      }
    },

    toggleHandover: (id) =>
      set((state) => ({
        checkedHandovers: { ...state.checkedHandovers, [id]: !state.checkedHandovers[id] },
      })),

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
