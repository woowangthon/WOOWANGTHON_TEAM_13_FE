import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMyAvailability, getMySchedule, putMyAvailability } from '@/api/mocks/staff/api/schedule'
import type { AvailabilityInput, MyAvailability } from '@/lib/api/types'

/*
 * 근무 훅 (P1) — 담당: 민지
 * 지금은 가짜 서버(api/mocks/staff/api)를 부른다. BE 표에 근무 API 가 없어 경로는 제안 (docs/07 7).
 * BE 연결 시 fetch 함수 안쪽만 apiFetch(`/stores/${storeId}/schedules/me` …)로 바꾸면 된다.
 */

export const scheduleKeys = {
  mine: (storeId: string) => ['stores', storeId, 'schedules', 'me'] as const,
  availability: (storeId: string) => ['stores', storeId, 'availability', 'me'] as const,
}

const fetchSchedule = (storeId: string) => getMySchedule(storeId)
const fetchAvailability = (storeId: string) => getMyAvailability(storeId)
const putAvailability = (storeId: string, body: AvailabilityInput) =>
  putMyAvailability(storeId, body)

/** 내 근무: 오늘 · 이번 주 · 확정된 근무 */
export function useMySchedule(storeId: string) {
  return useQuery({ queryKey: scheduleKeys.mine(storeId), queryFn: () => fetchSchedule(storeId) })
}

/** 근무 가능 시간 (받는 달 · 마감일 · 제출 내용) */
export function useMyAvailability(storeId: string) {
  return useQuery({
    queryKey: scheduleKeys.availability(storeId),
    queryFn: () => fetchAvailability(storeId),
  })
}

/** 근무 가능 시간 제출 */
export function useSubmitAvailability(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AvailabilityInput) => putAvailability(storeId, body),
    onSuccess: (saved) =>
      queryClient.setQueryData<MyAvailability>(scheduleKeys.availability(storeId), saved),
  })
}
