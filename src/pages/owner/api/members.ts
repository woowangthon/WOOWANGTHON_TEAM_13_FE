import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createMember, getMembers, removeMember, updateHourlyWage } from '@/api/mocks/owner/api'
import { http, isRealApi } from '@/lib/api/source'
import { ownerKeys } from '@/pages/owner/api/stores'
import type { InvitationResponse, Member, NewMember } from '@/pages/owner/api/types'

/*
 * 직원 · 초대코드 훅 — 담당: 나현
 * 초대코드 만들기는 .env VITE_REAL_API 에 'invitations'(+ 'stores')를 넣으면 진짜 API, 아니면 가짜 서버(api/mocks/owner).
 * 직원 목록 · 시급 · 퇴사는 아직 가짜 서버만 (BE 미구현). 시급 API 모양은 docs/07 8-2
 */

// BE 초대코드 응답 → 직원(입장 전). 직원 목록 API 가 나오기 전이라 invitationId 를 memberId 로 쓴다
const postInvitation = async (storeId: string, input: NewMember): Promise<Member> => {
  if (!isRealApi('invitations')) return createMember(storeId, input)
  const invitation = await http.post<InvitationResponse>(`/stores/${storeId}/invitations`, {
    staffName: input.name,
    hourlyWage: input.hourlyWage,
  })
  return {
    memberId: invitation.invitationId,
    storeId: invitation.storeId,
    name: invitation.staffName,
    hourlyWage: invitation.hourlyWage,
    status: 'invited',
    inviteCode: invitation.code,
    shiftLabel: '새 알바생',
  }
}

/** 직원 목록 (퇴사한 직원 빼고) */
export function useMembers(storeId: string) {
  return useQuery({
    queryKey: ownerKeys.members(storeId),
    queryFn: () => getMembers(storeId),
    enabled: !!storeId,
  })
}

/** 알바생 추가 → 초대코드 발급 */
export function useCreateMember(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: NewMember) => postInvitation(storeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.members(storeId) })
      queryClient.invalidateQueries({ queryKey: ownerKeys.stores })
    },
  })
}

/** 시급 바꾸기 (최저시급 미만이면 422 WAGE_BELOW_MINIMUM) */
export function useUpdateHourlyWage(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, hourlyWage }: { memberId: string; hourlyWage: number }) =>
      updateHourlyWage(memberId, hourlyWage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.members(storeId) })
      queryClient.invalidateQueries({ queryKey: ownerKeys.payroll(storeId) })
    },
  })
}

/** 퇴사 처리: 초대코드 삭제 → 접근 바로 차단, 기록은 남김 */
export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removeMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerKeys.all }),
  })
}
