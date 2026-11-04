import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyPayrollEstimate, saveMyPaySettings } from '@/api/mocks/staff/api/payroll'
import type { PaySettingsInput } from '@/lib/api/types'

/*
 * 급여 훅 (P1) — 담당: 민지
 * 지금은 가짜 서버(api/mocks/staff/api)를 부른다. BE 연결 시 fetch 함수 안쪽만
 * apiFetch(`/stores/${storeId}/payroll/estimates/me`)로 바꾸면 된다. 응답 모양: docs/07 8
 * 시급 설정은 사장님 기능(PUT /stores/{storeId}/members/{memberId}/hourly-wage, 사장님 화면).
 */

/** 2026년 최저시급 (docs/03 S4) */
export const MIN_HOURLY_WAGE = 10320

export const payrollKeys = {
  estimate: (storeId: string) => ['stores', storeId, 'payroll', 'estimates', 'me'] as const,
}

const fetchEstimate = (storeId: string) => getMyPayrollEstimate(storeId)

/** 내 예상 급여 (참고용) */
export function useMyPayrollEstimate(storeId: string) {
  return useQuery({
    queryKey: payrollKeys.estimate(storeId),
    queryFn: () => fetchEstimate(storeId),
  })
}

/** 여러 매장의 예상 급여 ("전체" 보기). 모두 받으면 data, 아니면 undefined */
export function useMyPayrollEstimates(storeIds: string[]) {
  return useQueries({
    queries: storeIds.map((storeId) => ({
      queryKey: payrollKeys.estimate(storeId),
      queryFn: () => fetchEstimate(storeId),
    })),
    combine: (results) =>
      results.every((result) => result.data) ? results.map((result) => result.data!) : undefined,
  })
}

/**
 * 임시: 알바 화면 급여 설정 저장 — BE 에 알바용 API 가 없어 가짜 서버에만 저장한다.
 * BE 답(docs/07 질문 4: 알바 화면은 보기 전용?)이 오면 지우거나 바꾼다.
 */
export function useSaveMyPaySettings(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PaySettingsInput) => saveMyPaySettings(storeId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payrollKeys.estimate(storeId) }),
  })
}
