import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/*
 * 로그인 사용자 상태 — 담당: 민지
 * me 는 BE 의 GET /me 응답 (닉네임 · 소속 매장 · 매장별 역할). 응답 형태가 확정되면 타입을 맞춘다.
 * pendingRole 은 역할 선택(/role)에서 고른 역할. 매장 입장 · 생성 전이라 me 에 역할이 없어도
 * 그 역할 화면(/staff/join, /owner/store/new)에 들어갈 수 있게 한다. 새로고침해도 남도록 sessionStorage 에 둔다.
 */

export type StoreRole = 'owner' | 'staff'

export interface MyStore {
  storeId: string
  storeName: string
  role: StoreRole
}

export interface Me {
  userId: string
  nickname: string
  stores: MyStore[]
}

interface AuthState {
  /** 앱 시작 시 세션 확인이 끝났는지 */
  isReady: boolean
  isLoggedIn: boolean
  me: Me | null
  pendingRole: StoreRole | null
  setReady: (value: boolean) => void
  setLoggedIn: (value: boolean) => void
  /** me 에 pendingRole 매장이 생기면(입장 · 생성 완료) pendingRole 을 지운다 */
  setMe: (me: Me | null) => void
  setPendingRole: (role: StoreRole | null) => void
  /** 로그아웃: 사용자 · pendingRole 을 지운다 (isReady 는 그대로) */
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isReady: false,
      isLoggedIn: false,
      me: null,
      pendingRole: null,
      setReady: (value) => set({ isReady: value }),
      setLoggedIn: (value) => set({ isLoggedIn: value }),
      setMe: (me) =>
        set((state) => ({
          me,
          pendingRole: me?.stores.some((store) => store.role === state.pendingRole)
            ? null
            : state.pendingRole,
        })),
      setPendingRole: (role) => set({ pendingRole: role }),
      reset: () => set({ isLoggedIn: false, me: null, pendingRole: null }),
    }),
    {
      name: 'pending-role',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ pendingRole: state.pendingRole }),
    },
  ),
)

/** 로그인 뒤 갈 곳: 매장이 없으면 역할 선택, 있으면 첫 매장 역할의 홈 */
export function getHomePath(me: Me | null) {
  const first = me?.stores[0]
  if (!first) return '/role'
  return first.role === 'owner' ? '/owner' : '/staff'
}
