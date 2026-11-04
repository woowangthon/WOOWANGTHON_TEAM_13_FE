import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAvailability,
  getMyAvailability,
  getMySchedule,
  updateAvailability,
} from '@/api/mocks/staff/api/schedule'
import type {
  AvailabilityInput,
  MyAvailability,
  MySchedule,
  NewAvailability,
} from '@/lib/api/types'
import { fromDateKey } from '@/lib/date'

/*
 * 근무 훅 (P1) — 담당: 민지
 * 지금은 가짜 서버(api/mocks/staff/api)를 부른다. BE 연결 시 fetch 함수 안쪽만 apiFetch 로 바꾸면 된다.
 *   GET /stores/{storeId}/schedules/me · GET /stores/{storeId}/availabilities/me
 *   POST /stores/{storeId}/availabilities · PATCH /stores/{storeId}/availabilities/{availabilityId}
 * 응답 모양: docs/07 7
 */

export const scheduleKeys = {
  mine: (storeId: string) => ['stores', storeId, 'schedules', 'me'] as const,
  availability: (storeId: string) => ['stores', storeId, 'availabilities', 'me'] as const,
}

const fetchSchedule = (storeId: string) => getMySchedule(storeId)
const fetchAvailability = (storeId: string) => getMyAvailability(storeId)
const postAvailability = (storeId: string, body: NewAvailability) =>
  createAvailability(storeId, body)
const patchAvailability = (storeId: string, availabilityId: string, body: AvailabilityInput) =>
  updateAvailability(storeId, availabilityId, body)

/** 내 근무: 오늘 · 이번 주 · 확정된 근무 */
export function useMySchedule(storeId: string) {
  return useQuery({ queryKey: scheduleKeys.mine(storeId), queryFn: () => fetchSchedule(storeId) })
}

/**
 * 이번 주 근무 한 줄: 모두 주말이면 "주말 오후", 아니면 "주 3회 마감" (가장 많은 근무 이름). 근무가 없으면 null
 */
export function workSummaryOf(schedule: MySchedule): string | null {
  const start = fromDateKey(schedule.weekStart)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
  const week = schedule.shifts.filter((shift) => {
    const date = fromDateKey(shift.date)
    return date >= start && date < end
  })
  if (week.length === 0) return null

  const counts = new Map<string, number>()
  for (const { role } of week) counts.set(role, (counts.get(role) ?? 0) + 1)
  const role = [...counts].sort((a, b) => b[1] - a[1])[0][0]
  const weekendOnly = week.every((shift) => [0, 6].includes(fromDateKey(shift.date).getDay()))
  return weekendOnly ? `주말 ${role}` : `주 ${week.length}회 ${role}`
}

/** 여러 매장의 이번 주 근무 한 줄 (매장 목록 "주 3회 마감 · 박 사장님") — storeId → 한 줄 */
export function useWorkSummaries(storeIds: string[]) {
  return useQueries({
    queries: storeIds.map((storeId) => ({
      queryKey: scheduleKeys.mine(storeId),
      queryFn: () => fetchSchedule(storeId),
    })),
    // 결과가 같으면 같은 객체를 돌려줘서 매장 목록이 렌더마다 새로 만들어지지 않는다
    combine: (results) =>
      Object.fromEntries(
        storeIds.map((storeId, i) => {
          const data = results[i]?.data
          return [storeId, data ? workSummaryOf(data) : null]
        }),
      ) as Record<string, string | null>,
  })
}

/** 근무 가능 시간 (받는 달 · 마감일 · 낸 내용) */
export function useMyAvailability(storeId: string) {
  return useQuery({
    queryKey: scheduleKeys.availability(storeId),
    queryFn: () => fetchAvailability(storeId),
  })
}

/** 근무 가능 시간 제출: 처음이면 등록(POST), 이미 냈으면 수정(PATCH) */
export function useSubmitAvailability(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ saved, ...body }: AvailabilityInput & { saved: MyAvailability }) =>
      saved.availabilityId
        ? patchAvailability(storeId, saved.availabilityId, body)
        : postAvailability(storeId, { ...body, month: saved.month }),
    onSuccess: (result) =>
      queryClient.setQueryData<MyAvailability>(scheduleKeys.availability(storeId), result),
  })
}
