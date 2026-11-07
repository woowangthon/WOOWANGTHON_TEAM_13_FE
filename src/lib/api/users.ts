import { useQuery } from '@tanstack/react-query'
import { getMe, getMyStores } from '@/api/mocks/staff/api/users'
import { http, isRealApi } from '@/lib/api/source'
import type { MyStoreDetail, MyStoreList } from '@/lib/api/types'
import type { Me, MyStore } from '@/lib/authStore'

/*
 * 사용자 · 내 매장 훅 — 담당: 민지
 * .env VITE_REAL_API 에 'users'를 넣으면 진짜 API(apiFetch), 아니면 가짜 서버(api/mocks/staff/api) — lib/api/source. 경로 · 응답: docs/07 1
 * 로그인 사용자(me)는 화면 보호(guards)에서도 쓰므로 useAuthStore 에 둔다 (auth.ts 가 fetchMe 로 채움).
 */

export const userKeys = {
  myStores: ['users', 'me', 'stores'] as const,
}

/**
 * GET /users/me (확정 11/4). BE 는 토큰으로 사용자를 알아서 인자가 필요 없다.
 * 가짜 서버는 Supabase 로그인 정보(이름 · 이메일 · 로그인 방식)를 받아서 만든다.
 */
export function fetchMe(loginUser: Omit<Me, 'stores'>): Promise<Me> {
  return isRealApi('users') ? http.get<Me>('/users/me') : getMe(loginUser)
}

/**
 * BE GET /users/me/stores 실제 응답 (11/7 확인): 감싸지 않은 배열 + 3칸(storeId · storeName · role)만.
 * 화면이 쓰는 매장 정보(docs/07 1-3)로 바꾸고, 아직 안 주는 칸은 빈 값으로 둔다 (BE 에 요청 중).
 * BE 가 docs/07 모양({ stores: [...] })으로 바꾸면 그대로 쓴다.
 */
export function toMyStoreList(data: MyStore[] | MyStoreList): MyStoreList {
  if (!Array.isArray(data)) return data
  return {
    stores: data.map(
      (store): MyStoreDetail => ({
        storeId: store.storeId,
        name: store.storeName,
        role: store.role,
        kind: '',
        address: '',
        ownerName: '',
        memberId: '',
        staffName: null,
        photoUrl: null,
        theme: null,
        joinedAt: '',
      }),
    ),
  }
}

const fetchMyStores = async () =>
  isRealApi('users')
    ? toMyStoreList(await http.get<MyStore[] | MyStoreList>('/users/me/stores'))
    : getMyStores()

/** 내 매장 (알바 화면 매장 전환 · 홈 · 마이페이지) */
export function useMyStores() {
  return useQuery({ queryKey: userKeys.myStores, queryFn: fetchMyStores })
}
