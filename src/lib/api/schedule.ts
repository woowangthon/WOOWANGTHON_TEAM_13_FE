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
  Shift,
} from '@/lib/api/types'
import { http, isRealApi } from '@/lib/api/source'
import { ApiError } from '@/lib/apiClient'
import { addDays, fromDateKey, todayInKst, toDateKey } from '@/lib/date'

/*
 * 근무 훅 (P1) — 담당: 민지
 * .env VITE_REAL_API 에 'schedule'를 넣으면 내 근무표(GET /schedules/me)를, 'availability'를 넣으면 근무 가능 시간을 진짜 API(apiFetch)로,
 * 아니면 가짜 서버(api/mocks/staff/api) — lib/api/source. 경로 · 응답: docs/07 7
 * 내 근무표(GET /schedules/me)는 BE PR #24(은교)에서 모양을 맞춰 뒀다 (docs/07 7-1). main 에 합쳐지기 전에 schedule 을 켜도
 * 404 면 빈 근무표로 보여 줘서 홈 · 근무 탭이 깨지지 않는다
 */

/** 근무 가능 시간 메모 최대 글자 수 (BE 검증) */
export const AVAILABILITY_MEMO_MAX = 500

export const scheduleKeys = {
  mine: (storeId: string) => ['stores', storeId, 'schedules', 'me'] as const,
  availability: (storeId: string) => ['stores', storeId, 'availabilities', 'me'] as const,
}

const real = () => isRealApi('schedule')
const realAvailability = () => isRealApi('availability')
const availabilitiesPath = (storeId: string) => `/stores/${storeId}/availabilities`

/** 근무가 없을 때의 근무표 (오늘 · 이번 주 월요일은 한국 시간 기준) */
function emptySchedule(): MySchedule {
  const today = todayInKst()
  const monday = addDays(today, -((today.getDay() + 6) % 7))
  return {
    today: toDateKey(today),
    weekStart: toDateKey(monday),
    weekHours: 0,
    weeklyAllowanceHours: 15,
    weekNote: '',
    shifts: [],
  }
}

/** 내 근무표: 진짜 API 가 아직 없으면(404) 빈 근무표 — BE 근무표 API 가 main 에 합쳐지면 저절로 진짜가 보인다 */
async function fetchSchedule(storeId: string): Promise<MySchedule> {
  if (!real()) return getMySchedule(storeId)
  try {
    return await http.get<MySchedule>(`/stores/${storeId}/schedules/me`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return emptySchedule()
    throw error
  }
}

/** 근무 이름: 사장님이 안 정하면 BE 는 "" 를 준다 → "근무" */
export function shiftLabel(shift: Pick<Shift, 'role'>) {
  return shift.role.trim() || '근무'
}
const fetchAvailability = (storeId: string) =>
  realAvailability()
    ? http.get<MyAvailability>(`${availabilitiesPath(storeId)}/me`)
    : getMyAvailability(storeId)
const postAvailability = (storeId: string, body: NewAvailability) =>
  realAvailability()
    ? http.post<MyAvailability>(availabilitiesPath(storeId), body)
    : createAvailability(storeId, body)
const patchAvailability = (storeId: string, availabilityId: string, body: AvailabilityInput) =>
  realAvailability()
    ? http.patch<MyAvailability>(`${availabilitiesPath(storeId)}/${availabilityId}`, body)
    : updateAvailability(storeId, availabilityId, body)

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
  for (const shift of week) counts.set(shiftLabel(shift), (counts.get(shiftLabel(shift)) ?? 0) + 1)
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

/**
 * 근무 가능 시간 제출: 처음이면 등록(POST), 이미 냈으면 수정(PATCH).
 * 409(다른 기기에서 이미 냄 AVAILABILITY_EXISTS · 마감 AVAILABILITY_CLOSED)면 서버 내용을 다시 불러온다
 */
export function useSubmitAvailability(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ saved, ...body }: AvailabilityInput & { saved: MyAvailability }) =>
      saved.availabilityId
        ? patchAvailability(storeId, saved.availabilityId, body)
        : postAvailability(storeId, { ...body, month: saved.month }),
    onSuccess: (result) =>
      queryClient.setQueryData<MyAvailability>(scheduleKeys.availability(storeId), result),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: scheduleKeys.availability(storeId) })
      }
    },
  })
}
