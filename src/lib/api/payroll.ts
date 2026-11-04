import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyPayrollEstimate, saveMyPaySettings } from '@/api/mocks/staff/api/payroll'
import { http, isRealApi } from '@/lib/api/source'
import type { PayrollEstimate, PaySettingsInput } from '@/lib/api/types'

/*
 * 급여 훅 (P1) — 담당: 민지
 * .env VITE_REAL_API 에 'payroll'를 넣으면 진짜 API(apiFetch), 아니면 가짜 서버(api/mocks/staff/api) — lib/api/source. 경로 · 응답: docs/07 8
 * 시급 설정은 사장님 기능(PUT /stores/{storeId}/members/{memberId}/hourly-wage, 사장님 화면).
 */

/** 2026년 최저시급 (docs/03 S4) */
export const MIN_HOURLY_WAGE = 10320

export const payrollKeys = {
  estimate: (storeId: string) => ['stores', storeId, 'payroll', 'estimates', 'me'] as const,
}

const fetchEstimate = (storeId: string) =>
  isRealApi('payroll')
    ? http.get<PayrollEstimate>(`/stores/${storeId}/payroll/estimates/me`)
    : getMyPayrollEstimate(storeId)

/** 내 예상 급여 (참고용) */
export function useMyPayrollEstimate(storeId: string) {
  return useQuery({
    queryKey: payrollKeys.estimate(storeId),
    queryFn: () => fetchEstimate(storeId),
  })
}

/** 여러 매장의 예상 급여 ("전체" 보기). 모두 받으면 data, 하나라도 실패하면 error · retry */
export function useMyPayrollEstimates(storeIds: string[]) {
  return useQueries({
    queries: storeIds.map((storeId) => ({
      queryKey: payrollKeys.estimate(storeId),
      queryFn: () => fetchEstimate(storeId),
    })),
    combine: (results) => ({
      data: results.every((result) => result.data)
        ? results.map((result) => result.data!)
        : undefined,
      error: results.find((result) => result.error)?.error ?? null,
      retry: () => results.forEach((result) => result.isError && result.refetch()),
    }),
  })
}

/**
 * 임시: 알바 화면 급여 설정 저장 — BE 에 알바용 API 가 없어 가짜 서버에만 저장한다.
 * BE 답(docs/07 질문 4: 알바 화면은 보기 전용?)이 오면 지우거나 바꾼다.
 */
export function useSaveMyPaySettings(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    // 진짜 API 에는 알바용 저장이 없어서, payroll 을 켜면 저장은 실패로 알린다 (토스트)
    mutationFn: (input: PaySettingsInput) =>
      isRealApi('payroll')
        ? Promise.reject(new Error('급여 설정 저장 API 가 아직 없어요'))
        : saveMyPaySettings(storeId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payrollKeys.estimate(storeId) }),
  })
}
