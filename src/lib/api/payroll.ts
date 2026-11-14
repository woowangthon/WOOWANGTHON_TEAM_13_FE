import { useQueries, useQuery } from '@tanstack/react-query'
import { getMyPayrollEstimate } from '@/api/mocks/staff/api/payroll'
import { http, isRealApi } from '@/lib/api/source'
import type { PayrollEstimate } from '@/lib/api/types'

/*
 * 급여 훅 (P1) — 담당: 민지
 * .env VITE_REAL_API 에 'payroll'를 넣으면 진짜 API(apiFetch), 아니면 가짜 서버(api/mocks/staff/api) — lib/api/source. 경로 · 응답: docs/07 8
 * 급여 설정(시급 · 급여일 · 공제 · 주휴수당)은 사장님이 정한다 → 알바는 예상 급여 응답으로 보기만 한다 (docs/07 질문 4).
 */

/** 2026년 최저시급 (docs/03 S4) */
export const MIN_HOURLY_WAGE = 10320

export const payrollKeys = {
  /** 모든 달 (저장 뒤 다시 불러오기용) */
  estimate: (storeId: string) => ['stores', storeId, 'payroll', 'estimates', 'me'] as const,
  /** 한 달. month 가 null 이면 서버 기준 이번 달 */
  month: (storeId: string, month: string | null) =>
    [...payrollKeys.estimate(storeId), month ?? 'current'] as const,
}

/** GET /stores/{storeId}/payroll/estimates/me?month=2026-11 (month 를 빼면 서버 기준 이번 달, docs/07 8-1) */
async function fetchEstimate(storeId: string, month: string | null): Promise<PayrollEstimate> {
  if (isRealApi('payroll')) {
    const query = month ? `?month=${month}` : ''
    return http.get<PayrollEstimate>(`/stores/${storeId}/payroll/estimates/me${query}`)
  }
  return getMyPayrollEstimate(storeId, month ?? undefined)
}

/**
 * 내 예상 급여 (참고용). month 를 안 주면 이번 달.
 * silent: 실패해도 에러 토스트 없이 (알바 홈 오늘 근무 카드의 월급날 칩처럼 없어도 되는 곳)
 */
export function useMyPayrollEstimate(
  storeId: string,
  month: string | null = null,
  { silent = false }: { silent?: boolean } = {},
) {
  return useQuery({
    queryKey: payrollKeys.month(storeId, month),
    queryFn: () => fetchEstimate(storeId, month),
    meta: silent ? { silent: true } : undefined,
  })
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 급여일: 예상 급여 달의 다음 달 payday 일 (31 = 말일, 29 · 30일이 없는 달(2월 등)은 그 달 말일).
 * 사장님이 아직 안 정했으면 null — 예상 급여 탭 "12/10(목) 입금 예정 · D-20" · 알바 홈 "월급날 D-20" 이 같이 쓴다
 */
export function payDateOf(estimate: Pick<PayrollEstimate, 'month' | 'payday'>): Date | null {
  if (estimate.payday === null) return null
  const [year, month] = estimate.month.split('-').map(Number)
  return new Date(year, month, Math.min(estimate.payday, new Date(year, month + 1, 0).getDate()))
}

/** 오늘(0시)부터 그날(0시)까지 남은 날 (당일 0 · 지난 날은 음수) */
export function daysUntil(date: Date, today: Date) {
  return Math.round((date.getTime() - today.getTime()) / DAY_MS)
}

/** 여러 매장의 예상 급여 ("전체" 보기). 모두 받으면 data, 하나라도 실패하면 error · retry */
export function useMyPayrollEstimates(storeIds: string[], month: string | null = null) {
  return useQueries({
    queries: storeIds.map((storeId) => ({
      queryKey: payrollKeys.month(storeId, month),
      queryFn: () => fetchEstimate(storeId, month),
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
