import { useMutation, useQueryClient } from '@tanstack/react-query'
import { joinMembership, verifyInvitation } from '@/api/mocks/staff/api/invitations'
import { http, isRealApi } from '@/lib/api/source'
import type { InviteVerification, Membership } from '@/lib/api/types'
import { userKeys } from '@/lib/api/users'

/*
 * 초대코드 훅 — 담당: 민지
 * .env VITE_REAL_API 에 'invitations'를 넣으면 진짜 API(apiFetch), 아니면 가짜 서버(api/mocks/staff/api) — lib/api/source. 경로 · 응답: docs/07 2
 */

const postVerify = (code: string) =>
  isRealApi('invitations')
    ? http.post<InviteVerification>('/invitations/verify', { code })
    : verifyInvitation(code)
const postJoin = (code: string) =>
  isRealApi('invitations')
    ? http.post<Membership>('/memberships/join', { code })
    : joinMembership(code)

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
