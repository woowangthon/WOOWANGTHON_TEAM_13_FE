import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createMember, getMembers, removeMember, updateHourlyWage } from '@/api/mocks/owner/api'
import { ownerKeys } from '@/pages/owner/api/stores'
import type { NewMember } from '@/pages/owner/api/types'

// 직원 · 초대코드 훅 (임시, 담당: 나현) — 가짜 서버(api/mocks/owner). 시급 API 모양은 docs/07 8-2

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
    mutationFn: (input: NewMember) => createMember(storeId, input),
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
