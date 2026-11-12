import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createMember,
  getMembers,
  removeMember,
  updateHourlyWage,
  updateInviteSchedule,
  updateTaxType,
} from '@/api/mocks/owner/api'
import { http, isRealApi } from '@/lib/api/source'
import { ApiError, apiFetch } from '@/lib/apiClient'
import { ownerKeys } from '@/pages/owner/api/stores'
import type { TaxType } from '@/pages/owner/payroll/tax'
import type {
  InvitationResponse,
  InvitationSummary,
  InviteShareInfo,
  Member,
  MemberResponse,
  NewMember,
  WeekShift,
} from '@/pages/owner/api/types'

/*
 * 직원 · 초대코드 훅 — 담당: 나현
 * .env VITE_REAL_API 에 'members'를 넣으면 직원 목록 · 퇴사가, 'invitations'를 넣으면 초대코드 만들기가 진짜 API.
 * 둘 다 진짜 매장 ID 가 필요해서 'stores'도 같이 켠다. 아니면 가짜 서버(api/mocks/owner).
 * 시급 바꾸기는 입장한 직원만 (PUT …/members/{memberId}/hourly-wage, BE #27). 입장 전 코드의 시급은 BE 에서 못 바꾼다.
 */

/**
 * 초대할 때 고정 근무(요일 × 타임)를 같이 정할 수 있는지.
 * BE #38: 초대 생성 · 조회 · 수정에 schedule, 입장하면 그 사람 고정 스케줄로 옮긴다
 */
const INVITE_SCHEDULE_IN_BE = true
export const canSaveInviteSchedule = () => !isRealApi('invitations') || INVITE_SCHEDULE_IN_BE

/** 초대코드 만들기 결과. existing 이면 같은 이름으로 이미 쓸 수 있는 코드가 있어서 그 코드를 돌려준 것 (409) */
export interface CreatedMember {
  member: Member
  existing: boolean
}

const invitedMember = (
  storeId: string,
  invitation: Pick<InvitationResponse, 'invitationId' | 'code' | 'staffName' | 'hourlyWage'> &
    Partial<Pick<InvitationResponse, 'schedule'>>,
): Member => ({
  memberId: invitation.invitationId,
  invitationId: invitation.invitationId,
  storeId,
  name: invitation.staffName,
  hourlyWage: invitation.hourlyWage,
  status: 'invited',
  inviteCode: invitation.code,
  shiftLabel: '입장 전',
  schedule: invitation.schedule ?? [],
})

/*
 * 화면의 직원 목록 = 입장한 직원(members, 퇴사 빼고) + 아직 입장 안 한 코드(invitations AVAILABLE).
 * 입장한 직원의 코드는 members 의 invitationId 로 찾는다.
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
      invitationId: m.invitationId,
      storeId,
      name: m.staffName,
      hourlyWage: m.hourlyWage,
      taxType: m.taxType ?? 'none',
      status: 'active',
      inviteCode: invitations.find((i) => i.invitationId === m.invitationId)?.code ?? '',
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
      ...(INVITE_SCHEDULE_IN_BE && input.schedule?.length ? { schedule: input.schedule } : {}),
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

/** 시급 바꾸기 요청. invited(입장 전)면 BE 에 직원이 아직 없다 */
export interface WageUpdate {
  memberId: string
  hourlyWage: number
  invited?: boolean
}

const putHourlyWage = async (storeId: string, { memberId, hourlyWage, invited }: WageUpdate) => {
  if (!isRealApi('members')) {
    await updateHourlyWage(memberId, hourlyWage)
    return
  }
  if (invited) {
    throw new ApiError(400, {
      code: 'MEMBER_NOT_JOINED',
      message: '입장 전에는 시급을 바꿀 수 없어요. 입장한 뒤에 바꿔 주세요',
      detail: null,
    })
  }
  // 최저시급 미만 422 WAGE_BELOW_MINIMUM · 퇴사 409 MEMBER_ALREADY_LEFT 는 BE 문구 그대로
  // lib/api/source 의 http 에는 put 이 없어서 apiFetch 로 (JSON 헤더는 apiFetch 가 붙인다)
  await apiFetch(`/stores/${storeId}/members/${memberId}/hourly-wage`, {
    method: 'PUT',
    body: JSON.stringify({ hourlyWage }),
  })
}

/**
 * 급여 공제(taxType) 바꾸기 — BE 는 저장 · 계산은 하지만 바꾸는 API 가 아직 없다 (요청 중, 제안: PUT …/members/{memberId}/tax-type).
 * 생기면 true 로. 그 전에는 진짜 모드에서 고를 수 없게 안내만
 */
const TAX_TYPE_IN_BE = false
export const canSetTaxType = () => !isRealApi('members') || TAX_TYPE_IN_BE

const putTaxType = async (
  storeId: string,
  { memberId, taxType }: { memberId: string; taxType: TaxType },
) => {
  if (!isRealApi('members')) {
    await updateTaxType(memberId, taxType)
    return
  }
  await apiFetch(`/stores/${storeId}/members/${memberId}/tax-type`, {
    method: 'PUT',
    body: JSON.stringify({ taxType }),
  })
}

/** 직원 급여 공제 바꾸기 (입장한 직원만) → 급여 다시 계산 */
export function useUpdateTaxType(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { memberId: string; taxType: TaxType }) => putTaxType(storeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.members(storeId) })
      queryClient.invalidateQueries({ queryKey: ownerKeys.payroll(storeId) })
    },
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
    mutationFn: (input: WageUpdate) => putHourlyWage(storeId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.members(storeId) })
      queryClient.invalidateQueries({ queryKey: ownerKeys.payroll(storeId) })
    },
  })
}

/** 입장 전 직원의 고정 근무 고치기 (PATCH /invitations/{invitationId}, BE #38 — 입장하면 이대로 고정 스케줄로) */
export function useUpdateInviteSchedule(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ member, schedule }: { member: Member; schedule: WeekShift[] }) => {
      if (!isRealApi('invitations')) return updateInviteSchedule(member.memberId, schedule)
      const invitation = await http.patch<InvitationResponse>(
        `/stores/${storeId}/invitations/${member.invitationId}`,
        { schedule },
      )
      return invitedMember(storeId, invitation)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerKeys.members(storeId) }),
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
