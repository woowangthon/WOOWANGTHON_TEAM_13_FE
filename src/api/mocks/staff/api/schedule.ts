import {
  availabilityMonth,
  initialAvailability,
  initialAvailabilityMemo,
  storeSchedules,
} from '@/api/mocks/staff/schedule'
import { fromDateKey, toDateKey } from '@/lib/date'
import { ApiError } from '@/lib/apiClient'
import type {
  AvailabilityInput,
  CalendarShift,
  MyAvailability,
  NewAvailability,
  ScheduleCalendar,
  ScheduleWorker,
} from '@/lib/api/types'

// 가짜 서버: 근무 API (docs/07 7) — 공유 근무 달력 + (BE 에서 없어진) 근무 가능 시간. 시연 날짜는 매장마다 다르다 (달빛 카페 11/20 · 오후의 커피 11/21)

/**
 * GET /stores/{storeId}/schedule-calendar?startDate=&endDate= — 요일마다 반복되는 고정 근무를 날짜별로 펼치고, 대타 칸은 사람만 바꾼다.
 * 시연의 '나'(userId 'me')는 로그인한 사람의 userId 로 바꿔서 돌려준다 (로그인 없이 볼 때는 usr_jieun)
 */
export async function getScheduleCalendar(
  storeId: string,
  startDate: string,
  endDate: string,
  myUserId: string,
): Promise<ScheduleCalendar> {
  const start = fromDateKey(startDate)
  const end = fromDateKey(endDate)
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  if (days < 0 || days > 62) {
    throw new ApiError(422, {
      code: 'INVALID_CALENDAR_PERIOD',
      message: '조회 기간은 시작일부터 최대 63일까지 가능해요',
      detail: null,
    })
  }
  const schedule = storeSchedules[storeId]
  if (!schedule) return { startDate, endDate, shifts: [] }
  const idOf = (userId: string) => (userId === 'me' ? myUserId : userId)
  const workerOf = (userId: string): ScheduleWorker => {
    const worker = schedule.workers.find((w) => w.userId === userId)
    return worker
      ? {
          userId: idOf(worker.userId),
          memberId: `mbr_${worker.userId}`,
          name: worker.name,
          role: worker.role,
        }
      : { userId: idOf(userId), memberId: null, name: '퇴사한 직원', role: 'staff' }
  }
  const shifts: CalendarShift[] = []
  for (let i = 0; i <= days; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const key = toDateKey(date)
    for (const shift of schedule.weekly) {
      if (!shift.dows.includes(date.getDay())) continue
      const substitute = schedule.substitutes[`${shift.id}|${key}`]
      shifts.push({
        assignmentId: shift.id,
        templateId: `tpl_${shift.name}_${shift.start}`,
        date: key,
        name: shift.name,
        start: shift.start,
        end: shift.end,
        role: shift.role,
        assignee: workerOf(substitute ?? shift.worker),
        substituted: substitute !== undefined,
      })
    }
  }
  shifts.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  return { startDate, endDate, shifts }
}

const monthKey = `${availabilityMonth.year}-${String(availabilityMonth.month).padStart(2, '0')}`
const submitted = new Map<string, MyAvailability>() // storeId → 낸 근무 가능 시간
let seq = 0

/** 아직 안 냈을 때: 시연용으로 미리 채운 달력 (availabilityId · submittedAt 은 null) */
function notSubmitted(): MyAvailability {
  return {
    availabilityId: null,
    month: monthKey,
    deadline: toDateKey(availabilityMonth.deadline),
    days: Object.entries(initialAvailability)
      .filter(([, mark]) => mark !== 0)
      .map(([day, mark]) => ({
        date: `${monthKey}-${day.padStart(2, '0')}`,
        status: mark === 1 ? 'available' : 'unavailable',
      })),
    memo: initialAvailabilityMemo,
    submittedAt: null,
  }
}

function notFound(): never {
  throw new ApiError(404, {
    code: 'NOT_FOUND',
    message: '근무 가능 시간을 찾지 못했어요',
    detail: null,
  })
}

/** GET /stores/{storeId}/availabilities/me */
export async function getMyAvailability(storeId: string): Promise<MyAvailability> {
  return submitted.get(storeId) ?? notSubmitted()
}

/** POST /stores/{storeId}/availabilities — 처음 낼 때 */
export async function createAvailability(
  storeId: string,
  body: NewAvailability,
): Promise<MyAvailability> {
  if (submitted.has(storeId)) {
    throw new ApiError(409, {
      code: 'AVAILABILITY_EXISTS',
      message: '이미 낸 근무 가능 시간이 있어요',
      detail: null,
    })
  }
  const saved: MyAvailability = {
    ...notSubmitted(),
    availabilityId: `avl_${++seq}`,
    month: body.month,
    days: body.days,
    memo: body.memo,
    submittedAt: new Date().toISOString(),
  }
  submitted.set(storeId, saved)
  return saved
}

/** PATCH /stores/{storeId}/availabilities/{availabilityId} — 다시 낼 때 */
export async function updateAvailability(
  storeId: string,
  availabilityId: string,
  body: AvailabilityInput,
): Promise<MyAvailability> {
  const current = submitted.get(storeId)
  if (!current || current.availabilityId !== availabilityId) notFound()
  const saved = {
    ...current,
    days: body.days,
    memo: body.memo,
    submittedAt: new Date().toISOString(),
  }
  submitted.set(storeId, saved)
  return saved
}

/** DELETE /stores/{storeId}/availabilities/{availabilityId} — 화면에서는 아직 안 쓴다 */
export async function deleteAvailability(storeId: string, availabilityId: string): Promise<void> {
  if (submitted.get(storeId)?.availabilityId !== availabilityId) notFound()
  submitted.delete(storeId)
}
