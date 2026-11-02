import { create } from 'zustand'

/*
 * 로그인 사용자 상태 — 담당: 민지
 * me 는 BE 의 GET /me 응답 (닉네임 · 소속 매장 · 매장별 역할). 응답 형태가 확정되면 타입을 맞춘다.
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
  isLoggedIn: boolean
  me: Me | null
  setLoggedIn: (value: boolean) => void
  setMe: (me: Me | null) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  me: null,
  setLoggedIn: (value) => set({ isLoggedIn: value }),
  setMe: (me) => set({ me }),
  reset: () => set({ isLoggedIn: false, me: null }),
}))
