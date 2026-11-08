import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createMember, getMembers, removeMember, updateHourlyWage } from '@/api/mocks/owner/api'
import { http, isRealApi } from '@/lib/api/source'
import { ApiError } from '@/lib/apiClient'
import { ownerKeys } from '@/pages/owner/api/stores'
import type {
  InvitationResponse,
  InvitationSummary,
  InviteShareInfo,
  Member,
  MemberResponse,
  NewMember,
} from '@/pages/owner/api/types'

/*
 * 직원 · 초대코드 훅 — 담당: 나현
 * .env VITE_REAL_API 에 'members'를 넣으면 직원 목록 · 퇴사가, 'invitations'를 넣으면 초대코드 만들기가 진짜 API.
 * 둘 다 진짜 매장 ID 가 필요해서 'stores'도 같이 켠다. 아니면 가짜 서버(api/mocks/owner).
 * 시급 바꾸기는 BE 미구현이라 진짜 모드에서는 안내만 한다. 시급 API 모양은 docs/07 8-2
 */

/** 초대코드 만들기 결과. existing 이면 같은 이름으로 이미 쓸 수 있는 코드가 있어서 그 코드를 돌려준 것 (409) */
export interface CreatedMember {
  member: Member
  existing: boolean
}

const invitedMember = (
  storeId: string,
  invitation: Pick<InvitationResponse, 'invitationId' | 'code' | 'staffName' | 'hourlyWage'>,
): Member => ({
  memberId: invitation.invitationId,
  invitationId: invitation.invitationId,
  storeId,
  name: invitation.staffName,
  hourlyWage: invitation.hourlyWage,
  status: 'invited',
  inviteCode: invitation.code,
  shiftLabel: '입장 전',
})

/*
 * 화면의 직원 목록 = 입장한 직원(members, 퇴사 빼고) + 아직 입장 안 한 코드(invitations AVAILABLE).
 * 입장한 직원의 코드는 같은 이름으로 쓰인(USED) 코드를 찾아 보여 준다 (BE 가 직원 ↔ 코드를 이어 주지 않아서).
 */
const fetchMembers = async (storeId: string): Promise<{ members: Member[] }> => {
  if (!isRealApi('members')) return getMembers(storeId)
  const [{ members }, { invitations }] = await Promise.all([
    http.get<{ members: MemberResponse[] }>(`/stores/${storeId}/members`),
    http.get<{ invitations: InvitationSummary[] }>(`/stores/${storeId}/invitations`),
  ])
  const joined = members
    .filter((m) => m.status === 'ACTIVE' && m.role !== 'owner')
    .map<Member>((m) => ({
      memberId: m.memberId,
      invitationId: null,
      storeId,
      name: m.staffName,
      hourlyWage: m.hourlyWage,
      status: 'active',
      inviteCode:
        invitations.find((i) => i.status === 'USED' && i.staffName === m.staffName)?.code ?? '',
      shiftLabel: '알바생',
    }))
  const waiting = invitations
    .filter((i) => i.status === 'AVAILABLE')
    .map((i) => invitedMember(storeId, i))
  return { members: [...joined, ...waiting] }
}

const postInvitation = async (storeId: string, input: NewMember): Promise<CreatedMember> => {
  if (!isRealApi('invitations')) {
    return { member: await createMember(storeId, input), existing: false }
  }
  try {
    const invitation = await http.post<InvitationResponse>(`/stores/${storeId}/invitations`, {
      staffName: input.name,
      hourlyWage: input.hourlyWage,
    })
    return { member: invitedMember(storeId, invitation), existing: false }
  } catch (error) {
    // 같은 이름으로 쓸 수 있는 코드가 이미 있으면 새로 만들지 않고 그 코드를 다시 보여 준다
    if (error instanceof ApiError && error.code === 'INVITE_ALREADY_AVAILABLE') {
      const { invitationId, code } = error.detail as { invitationId: string; code: string }
      const member = invitedMember(storeId, {
        invitationId,
        code,
        staffName: input.name,
        hourlyWage: input.hourlyWage,
      })
      return { member, existing: true }
    }
    throw error
  }
}

const putHourlyWage = async (memberId: string, hourlyWage: number) => {
  if (!isRealApi('members')) return updateHourlyWage(memberId, hourlyWage)
  throw new ApiError(400, {
    code: 'NOT_SUPPORTED',
    message: '시급 바꾸기는 아직 준비 중이에요',
    detail: null,
  })
}

// 입장한 직원은 퇴사(기록은 남김), 입장 전이면 초대코드 취소
const deleteMember = async (member: Member): Promise<void> => {
  if (!isRealApi('members')) return removeMember(member.memberId)
  if (member.status === 'invited' && member.invitationId) {
    return http.delete<void>(`/stores/${member.storeId}/invitations/${member.invitationId}`)
  }
  return http.delete<void>(`/stores/${member.storeId}/members/${member.memberId}`)
}

/** 직원 목록 (퇴사한 직원 빼고, 입장 전 코드 포함) */
export function useMembers(storeId: string) {
  return useQuery({
    queryKey: ownerKeys.members(storeId),
    queryFn: () => fetchMembers(storeId),
    enabled: !!storeId,
  })
}

/**
 * 카톡 공유 정보 (입장 전 코드만). 카톡은 누른 순간 열어야 막히지 않아서 카드가 보일 때 미리 불러 둔다.
 * 이미 쓰였거나 취소된 코드면 410 INVITE_REVOKED → 공통 토스트로 알린다. 가짜 서버 모드에서는 부르지 않는다.
 */
export function useInviteShareInfo(storeId: string, invitationId: string | null | undefined) {
  return useQuery({
    queryKey: [...ownerKeys.members(storeId), 'share-info', invitationId] as const,
    queryFn: () =>
      http.get<InviteShareInfo>(`/stores/${storeId}/invitations/${invitationId}/share-info`),
    enabled: isRealApi('invitations') && !!storeId && !!invitationId,
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
      putHourlyWage(memberId, hourlyWage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.members(storeId) })
      queryClient.invalidateQueries({ queryKey: ownerKeys.payroll(storeId) })
    },
  })
}

/** 퇴사 처리: 입장한 직원은 퇴사(접근 바로 차단, 기록은 남김) · 입장 전이면 초대코드 취소 */
export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerKeys.all }),
  })
}
