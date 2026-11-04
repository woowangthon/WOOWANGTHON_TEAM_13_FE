import { useMutation, useQueryClient } from '@tanstack/react-query'
import { joinMembership, verifyInvitation } from '@/api/mocks/staff/api/invitations'
import { userKeys } from '@/lib/api/users'

/*
 * 초대코드 훅 — 담당: 민지
 * 지금은 가짜 서버(api/mocks/staff/api)를 부른다. BE 연결 시 fetch 함수 안쪽만
 * apiFetch('/invitations/verify') · apiFetch('/memberships/join') 으로 바꾸면 된다. 응답 · 에러 코드: docs/07 2
 */

const postVerify = (code: string) => verifyInvitation(code)
const postJoin = (code: string) => joinMembership(code)

/** 초대코드 확인 (입장은 안 함) */
export function useVerifyInvite() {
  return useMutation({ mutationFn: postVerify })
}

/** 매장 입장 → 내 매장 목록을 다시 불러온다 */
export function useJoinStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: postJoin,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.myStores }),
  })
}
