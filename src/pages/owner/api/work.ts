import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { ownerKeys } from '@/pages/owner/api/stores'
import type { ScheduleDraft } from '@/pages/owner/api/types'

// 근무(달력 · 추천 스케줄) · 급여 훅 (임시, 담당: 나현) — 가짜 서버(api/mocks/owner)

/** 매장 전체 근무 (한 달) */
export function useMonthShifts(storeId: string, month: string) {
  return useQuery({
    queryKey: ownerKeys.shifts(storeId, month),
    queryFn: () => getMonthShifts(storeId, month),
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
    mutationFn: (input: { date: string; memberId: string; start: string; end: string }) =>
      addShift(storeId, input),
    onSuccess: invalidate,
  })
}

export function useDeleteShift(storeId: string) {
  const invalidate = useInvalidateShifts(storeId)
  return useMutation({
    mutationFn: (shiftId: string) => deleteShift(storeId, shiftId),
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
    queryFn: () => getAvailabilityStatus(storeId),
    enabled: !!storeId,
  })
}

export function useScheduleDraft(storeId: string) {
  return useQuery({
    queryKey: ownerKeys.draft(storeId),
    queryFn: () => getScheduleDraft(storeId),
    enabled: !!storeId,
  })
}

function useDraftMutation<T>(storeId: string, fn: (value: T) => Promise<ScheduleDraft>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (draft) => queryClient.setQueryData(ownerKeys.draft(storeId), draft),
  })
}

/** 추천 스케줄 만들기 (P1) */
export function useCreateDraft(storeId: string) {
  return useDraftMutation(storeId, () => createScheduleDraft(storeId))
}

/** 부족한 칸에 사장님 배정 */
export function useFillDraft(storeId: string) {
  return useDraftMutation(storeId, (date: string) => fillDraftShortage(storeId, date))
}

/** 확정하고 알리기 */
export function useConfirmDraft(storeId: string) {
  return useDraftMutation(storeId, () => confirmScheduleDraft(storeId))
}

/** 직원별 이번 달 급여 (참고용) */
export function useStorePayroll(storeId: string) {
  return useQuery({
    queryKey: ownerKeys.payroll(storeId),
    queryFn: () => getStorePayroll(storeId),
    enabled: !!storeId,
  })
}
