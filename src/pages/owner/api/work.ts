import { useQueries, useQuery } from '@tanstack/react-query'
import { getStorePayroll } from '@/api/mocks/owner/api'
import { http, isRealApi } from '@/lib/api/source'
import { ownerKeys } from '@/pages/owner/api/stores'
import type { MemberPay, PayrollEstimateList } from '@/pages/owner/api/types'

/*
 * 급여 훅 — 담당: 나현
 * .env VITE_REAL_API 에 'payroll'을 넣으면 진짜 API, 아니면 가짜 서버(api/mocks/owner).
 * 근무는 고정 스케줄로 바뀌어서(11/10 회의) pages/owner/api/fixedSchedule.ts 로 옮겼다.
 */

/*
 * 직원별 이번 달 급여. BE 이름을 화면 모양(MemberPay)으로 바꾼다 (연서 공유):
 * staffName → name · grossPay → total (공제 후는 netPay) · weeklyAllowanceEligible → eligible · today 는 BE 에 없다
 */
const fetchStorePayroll = async (
  storeId: string,
  month: string,
): Promise<{ month: string; members: MemberPay[] }> => {
  if (!isRealApi('payroll')) return getStorePayroll(storeId, month)
  const data = await http.get<PayrollEstimateList>(
    `/stores/${storeId}/payroll/estimates?month=${month}`,
  )
  return {
    month: data.month,
    members: data.members.map((m) => ({
      memberId: m.memberId,
      storeId,
      name: m.staffName,
      hours: m.hours,
      basePay: m.basePay,
      weeklyAllowance: m.weeklyAllowance,
      total: m.grossPay,
      weeks: m.weeks.map((w) => ({
        weekStart: w.weekStart,
        hours: w.hours,
        eligible: w.weeklyAllowanceEligible,
      })),
    })),
  }
}

/** 직원별 이번 달 급여 (참고용) */
export function useStorePayroll(storeId: string, month: string) {
  return useQuery({
    queryKey: [...ownerKeys.payroll(storeId), month],
    queryFn: () => fetchStorePayroll(storeId, month),
    enabled: !!storeId,
  })
}

/** 여러 매장 급여를 한 번에 (급여 탭 '전체') */
export function useStorePayrolls(storeIds: string[], month: string) {
  return useQueries({
    queries: storeIds.map((storeId) => ({
      queryKey: [...ownerKeys.payroll(storeId), month],
      queryFn: () => fetchStorePayroll(storeId, month),
    })),
  })
}
