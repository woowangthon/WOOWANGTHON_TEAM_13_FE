import { useQuery } from '@tanstack/react-query'
import { getMe, getMyStores } from '@/api/mocks/staff/api/users'
import type { Me } from '@/lib/authStore'

/*
 * 사용자 · 내 매장 훅 — 담당: 민지
 * 지금은 가짜 서버(api/mocks/staff/api)를 부른다. BE 연결 시 fetch 함수 안쪽만
 * apiFetch('/users/me') · apiFetch('/users/me/stores') 로 바꾸면 된다. 응답 모양: docs/07 1
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
  return getMe(loginUser)
}

const fetchMyStores = () => getMyStores()

/** 내 매장 (알바 화면 매장 전환 · 홈 · 마이페이지) */
export function useMyStores() {
  return useQuery({ queryKey: userKeys.myStores, queryFn: fetchMyStores })
}
