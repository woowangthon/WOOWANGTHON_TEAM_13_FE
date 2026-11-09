import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addShift,
  confirmScheduleDraft,
  createScheduleDraft,
  deleteShift,
  fillDraftShortage,
  getAvailabilityStatus,
  getMonthShifts,
  getScheduleDraft,
  getStorePayroll,
  saveDayMemo,
} from '@/api/mocks/owner/api'
import { http, isRealApi } from '@/lib/api/source'
import { toDateKey, todayInKst } from '@/lib/date'
import * as real from '@/pages/owner/api/schedule'
import { ownerKeys } from '@/pages/owner/api/stores'
import type { MemberPay, PayrollEstimateList, ScheduleDraft } from '@/pages/owner/api/types'

/*
 * 근무(달력 · 추천 스케줄) · 급여 훅 — 담당: 나현
 * .env VITE_REAL_API 에 'schedule'(근무 달력 · 추천 스케줄) · 'availability'(제출 현황) · 'payroll'(급여)을 넣으면 진짜 API.
 * 진짜 API 연결은 pages/owner/api/schedule.ts, 아니면 가짜 서버(api/mocks/owner).
 */

/** 부족한 칸에 사장님을 넣을 수 있는지 (진짜 API 는 BE 가 사장님 배정을 지원하기 전까지 못 한다) */
export const canOwnerTakeShift = () => !isRealApi('schedule')

/*
 * 직원별 이번 달 급여. BE 이름을 화면 모양(MemberPay)으로 바꾼다 (연서 공유):
 * staffName → name · grossPay → total (공제 후는 netPay) · weeklyAllowanceEligible → eligible · today 는 BE 에 없다
 */
const fetchStorePayroll = async (
  storeId: string,
): Promise<{ month: string; members: MemberPay[] }> => {
  if (!isRealApi('payroll')) return getStorePayroll(storeId)
  const month = toDateKey(todayInKst()).slice(0, 7)
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

/** 매장 전체 근무 (한 달) */
export function useMonthShifts(storeId: string, month: string) {
  return useQuery({
    queryKey: ownerKeys.shifts(storeId, month),
    queryFn: () =>
      isRealApi('schedule')
        ? real.fetchMonthShifts(storeId, month)
        : getMonthShifts(storeId, month),
    enabled: !!storeId,
  })
}

function useInvalidateShifts(storeId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['owner', 'stores', storeId, 'shifts'] })
}

export function useAddShift(storeId: string) {
  const invalidate = useInvalidateShifts(storeId)
  return useMutation({
    mutationFn: async (input: { date: string; memberId: string; start: string; end: string }) => {
      if (isRealApi('schedule')) await real.addShift(storeId, input)
      else await addShift(storeId, input)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteShift(storeId: string) {
  const invalidate = useInvalidateShifts(storeId)
  return useMutation({
    mutationFn: (shiftId: string) =>
      isRealApi('schedule') ? real.deleteShift(storeId, shiftId) : deleteShift(storeId, shiftId),
    onSuccess: invalidate,
  })
}

export function useSaveDayMemo(storeId: string) {
  const invalidate = useInvalidateShifts(storeId)
  return useMutation({
    mutationFn: ({ date, text }: { date: string; text: string }) =>
      saveDayMemo(storeId, date, text),
    onSuccess: invalidate,
  })
}

/** 다음 달 근무 가능 시간 제출 현황 */
export function useAvailabilityStatus(storeId: string) {
  return useQuery({
    queryKey: ownerKeys.availability(storeId),
    queryFn: () =>
      isRealApi('availability')
        ? real.fetchAvailabilityStatus(storeId)
        : getAvailabilityStatus(storeId),
    enabled: !!storeId,
  })
}

export function useScheduleDraft(storeId: string) {
  return useQuery({
    queryKey: ownerKeys.draft(storeId),
    queryFn: () => (isRealApi('schedule') ? real.fetchDraft(storeId) : getScheduleDraft(storeId)),
    enabled: !!storeId,
  })
}

function useDraftMutation<T>(storeId: string, fn: (value: T) => Promise<ScheduleDraft>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (draft) => {
      queryClient.setQueryData(ownerKeys.draft(storeId), draft)
      // 확정하면 근무 달력에도 들어간다
      queryClient.invalidateQueries({ queryKey: ['owner', 'stores', storeId, 'shifts'] })
    },
  })
}

/** 추천 스케줄 만들기 (P1) */
export function useCreateDraft(storeId: string) {
  return useDraftMutation(storeId, () =>
    isRealApi('schedule') ? real.createDraft(storeId) : createScheduleDraft(storeId),
  )
}

/** 부족한 칸에 사장님 배정 */
export function useFillDraft(storeId: string) {
  return useDraftMutation(storeId, (date: string) =>
    isRealApi('schedule') ? real.fillDraft() : fillDraftShortage(storeId, date),
  )
}

/** 확정하고 알리기 */
export function useConfirmDraft(storeId: string) {
  const queryClient = useQueryClient()
  return useDraftMutation(storeId, () => {
    const draft = queryClient.getQueryData<ScheduleDraft>(ownerKeys.draft(storeId))
    return isRealApi('schedule') && draft
      ? real.confirmDraft(storeId, draft)
      : confirmScheduleDraft(storeId)
  })
}

/** 직원별 이번 달 급여 (참고용) */
export function useStorePayroll(storeId: string) {
  return useQuery({
    queryKey: ownerKeys.payroll(storeId),
    queryFn: () => fetchStorePayroll(storeId),
    enabled: !!storeId,
  })
}

/** 여러 매장 급여를 한 번에 (급여 탭 '전체') */
export function useStorePayrolls(storeIds: string[]) {
  return useQueries({
    queries: storeIds.map((storeId) => ({
      queryKey: ownerKeys.payroll(storeId),
      queryFn: () => fetchStorePayroll(storeId),
    })),
  })
}
