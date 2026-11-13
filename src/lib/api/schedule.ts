import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAvailability,
  getMyAvailability,
  getScheduleCalendar,
  updateAvailability,
} from '@/api/mocks/staff/api/schedule'
import { findStaffStore } from '@/api/mocks/staff/stores'
import type {
  AvailabilityInput,
  CalendarShift,
  MyAvailability,
  MySchedule,
  NewAvailability,
  ScheduleCalendar,
  Shift,
} from '@/lib/api/types'
import { http, isRealApi } from '@/lib/api/source'
import { ApiError } from '@/lib/apiClient'
import { useAuthStore } from '@/lib/authStore'
import { addDays, fromDateKey, todayInKst, toDateKey, useTodayKey } from '@/lib/date'

/*
 * 근무 훅 (P1) — 담당: 민지
 * 11/10 회의 · BE #31: 근무표는 "알바생 모두가 같이 보는 전체 스케줄"이다.
 *   GET /stores/{storeId}/schedule-calendar?startDate=&endDate= (최대 63일, 구성원 누구나) → useScheduleCalendar
 *   내 근무(홈 오늘 근무 · 이번 주 · 매장 목록 한 줄 · 급여)는 그 달력에서 assignee.userId === 내 userId 만 골라 만든다 → useMySchedule
 * .env VITE_REAL_API 에 'schedule'를 넣으면 진짜 API, 아니면 가짜 서버(api/mocks/staff/api) — lib/api/source. 경로 · 응답: docs/07 7
 * 근무 가능 시간(/availabilities)은 BE 에서 없어졌다 → 진짜 모드에서는 들어가는 곳을 숨긴다 (availabilityEnabled)
 */

/** 근무 가능 시간 메모 최대 글자 수 (BE 검증) */
export const AVAILABILITY_MEMO_MAX = 500

/** 한 번에 불러올 수 있는 최대 기간 (BE: 시작일부터 63일) */
export const CALENDAR_MAX_DAYS = 63

export const scheduleKeys = {
  calendar: (storeId: string, startDate: string, endDate: string) =>
    ['stores', storeId, 'schedule-calendar', startDate, endDate] as const,
  /** 내 근무 — 오늘(KST)이 바뀌면 키가 바뀌어 다시 불러온다. 앞부분 ['stores', id, 'schedules', 'me'] 로 invalidate 하면 모든 날짜 */
  mine: (storeId: string, todayKey: string) =>
    ['stores', storeId, 'schedules', 'me', todayKey] as const,
  availability: (storeId: string) => ['stores', storeId, 'availabilities', 'me'] as const,
}

const real = () => isRealApi('schedule')
const realAvailability = () => isRealApi('availability')
const availabilitiesPath = (storeId: string) => `/stores/${storeId}/availabilities`

/** 근무 가능 시간 화면을 보여 줄지 — BE 에서 없어져서 진짜 모드(schedule · availability 중 하나라도 켜짐)면 숨긴다 */
export const availabilityEnabled = () => !real() && !realAvailability()

/** 로그인 없이 볼 때(VITE_SKIP_AUTH) 가짜 근무표의 '나' */
const MOCK_MY_USER_ID = 'usr_jieun'

/** 내 userId (GET /users/me) — 달력에서 내 근무를 고를 때 쓴다 */
export function myUserId() {
  return useAuthStore.getState().me?.userId ?? MOCK_MY_USER_ID
}

/** 근무표의 오늘: 진짜면 한국 시간 오늘, 가짜면 매장 시연 날짜 (달빛 카페 11/20) */
export function scheduleToday(storeId: string): Date {
  return real() ? todayInKst() : findStaffStore(storeId).today
}

/** 공유 근무 달력 (그 기간의 모든 사람 근무, 날짜 · 시작 시간 순) */
async function fetchCalendar(
  storeId: string,
  startDate: string,
  endDate: string,
): Promise<ScheduleCalendar> {
  if (!real()) return getScheduleCalendar(storeId, startDate, endDate, myUserId())
  try {
    return await http.get<ScheduleCalendar>(
      `/stores/${storeId}/schedule-calendar?startDate=${startDate}&endDate=${endDate}`,
    )
  } catch (error) {
    // 근무표를 아직 안 만든 매장 등 (없으면 빈 달력)
    if (error instanceof ApiError && error.status === 404) return { startDate, endDate, shifts: [] }
    throw error
  }
}

/** 공유 근무 달력: startDate ~ endDate ("2026-11-01", 최대 63일). enabled=false 면 부르지 않는다 (홈 요일 줄: 다른 주를 볼 때만) */
export function useScheduleCalendar(
  storeId: string,
  startDate: string,
  endDate: string,
  enabled = true,
) {
  return useQuery({
    queryKey: scheduleKeys.calendar(storeId, startDate, endDate),
    queryFn: () => fetchCalendar(storeId, startDate, endDate),
    enabled: !!storeId && enabled,
    // 다른 기기(사장님)에서 바꾼 근무가 화면으로 돌아오면 반영되게
    refetchOnWindowFocus: true,
  })
}

/**
 * 여러 매장의 공유 근무 달력 (같은 기간). useScheduleCalendar 와 같은 키라 근무표 탭에서 불러온 게 있으면 그대로 쓴다.
 * 예상 급여 상세 카드가 근무 이름(오픈 · 마감)을 찾는 데만 써서, 실패해도 토스트 없이 "근무"로 보여 준다
 */
export function useScheduleCalendars(storeIds: string[], startDate: string, endDate: string) {
  return useQueries({
    queries: storeIds.map((storeId) => ({
      queryKey: scheduleKeys.calendar(storeId, startDate, endDate),
      queryFn: () => fetchCalendar(storeId, startDate, endDate),
      enabled: !!storeId,
      meta: { silent: true },
    })),
  })
}

/** 근무 시간 (시간 단위, "18:00" ~ "23:00" → 5) */
export function shiftHours(shift: Pick<CalendarShift, 'start' | 'end'>) {
  const minutes = (time: string) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }
  return Math.max(0, minutes(shift.end) - minutes(shift.start)) / 60
}

/** 달력 한 칸의 고유 키: 고정 근무는 assignmentId, 하루 조정한 근무는 dailyShiftId (BE 는 둘 중 하나만 준다) */
export const shiftKey = (shift: CalendarShift) =>
  `${shift.dailyShiftId ?? shift.assignmentId}|${shift.date}`

/** 두 근무 시간이 조금이라도 겹치는지 ("09:00"~"13:30" 문자열 비교) */
export const overlaps = (
  a: Pick<CalendarShift, 'start' | 'end'>,
  b: Pick<CalendarShift, 'start' | 'end'>,
) => a.start < b.end && b.start < a.end

const WEEKLY_ALLOWANCE_HOURS = 15

/**
 * 달력에서 내 근무만 골라 홈 · 급여가 쓰던 모양(MySchedule)으로: 이번 주(월~일) 내 근무 · 시간 · 한 줄 설명.
 * 함께 일하는 사람 = 같은 날 시간이 겹치는 다른 사람
 */
export function toMySchedule(calendar: ScheduleCalendar, today: Date, myId: string): MySchedule {
  const monday = addDays(today, -((today.getDay() + 6) % 7))
  const weekKeys = new Set(Array.from({ length: 7 }, (_, i) => toDateKey(addDays(monday, i))))
  const shifts: Shift[] = calendar.shifts
    .filter((shift) => shift.assignee.userId === myId)
    .map((shift) => ({
      shiftId: shiftKey(shift),
      date: shift.date,
      start: shift.start,
      end: shift.end,
      role: shift.name.trim() || shift.role.trim(),
      crew: calendar.shifts
        .filter(
          (other) =>
            other.date === shift.date && other.assignee.userId !== myId && overlaps(other, shift),
        )
        .map((other) => other.assignee.name),
    }))
  const weekHours = shifts
    .filter((shift) => weekKeys.has(shift.date))
    .reduce((sum, shift) => sum + shiftHours(shift), 0)
  const rounded = Math.round(weekHours * 10) / 10
  return {
    today: toDateKey(today),
    weekStart: toDateKey(monday),
    weekHours: rounded,
    weeklyAllowanceHours: WEEKLY_ALLOWANCE_HOURS,
    weekNote:
      rounded === 0
        ? ''
        : rounded >= WEEKLY_ALLOWANCE_HOURS
          ? `이번 주 ${rounded}시간 · 주휴수당 대상`
          : `이번 주 ${rounded}시간 · ${Math.round((WEEKLY_ALLOWANCE_HOURS - rounded) * 10) / 10}시간 더 필요`,
    shifts,
  }
}

/** 내 근무 (이번 주): 달력에서 이번 주 월~일을 불러와 내 것만 */
async function fetchSchedule(storeId: string): Promise<MySchedule> {
  const today = scheduleToday(storeId)
  const monday = addDays(today, -((today.getDay() + 6) % 7))
  const calendar = await fetchCalendar(storeId, toDateKey(monday), toDateKey(addDays(monday, 6)))
  return toMySchedule(calendar, today, myUserId())
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
  // 오늘을 키에 넣어 자정이 지나면 새로 부르고, 화면으로 돌아오면 다시 부른다 (다른 기기에서 바꾼 근무)
  const todayKey = useTodayKey()
  return useQuery({
    queryKey: scheduleKeys.mine(storeId, todayKey),
    queryFn: () => fetchSchedule(storeId),
    refetchOnWindowFocus: true,
  })
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
  const todayKey = useTodayKey()
  return useQueries({
    queries: storeIds.map((storeId) => ({
      queryKey: scheduleKeys.mine(storeId, todayKey),
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

/** 근무 가능 시간 (받는 달 · 마감일 · 낸 내용). enabled=false 면 부르지 않는다 (진짜 모드: BE 에서 없어짐) */
export function useMyAvailability(storeId: string, enabled = true) {
  return useQuery({
    queryKey: scheduleKeys.availability(storeId),
    queryFn: () => fetchAvailability(storeId),
    enabled,
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
