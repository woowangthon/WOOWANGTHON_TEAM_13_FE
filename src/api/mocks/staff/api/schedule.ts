import {
  availabilityMonth,
  initialAvailability,
  initialAvailabilityMemo,
  myShifts,
} from '@/api/mocks/staff/schedule'
import { findStaffStore } from '@/api/mocks/staff/stores'
import { toDateKey } from '@/lib/date'
import { ApiError } from '@/lib/apiClient'
import type {
  AvailabilityInput,
  MyAvailability,
  MySchedule,
  NewAvailability,
} from '@/lib/api/types'

// 가짜 서버: 근무 API (docs/07 7) — 시연 날짜는 매장마다 다르다 (달빛 카페 11/20 · 오후의 커피 11/21)

const WEEKLY_ALLOWANCE_HOURS = 15

/** GET /stores/{storeId}/schedules/me */
export async function getMySchedule(storeId: string): Promise<MySchedule> {
  const store = findStaffStore(storeId)
  return {
    today: toDateKey(store.today),
    weekStart: toDateKey(store.week[0].date),
    weekHours: store.weekHours,
    weeklyAllowanceHours: WEEKLY_ALLOWANCE_HOURS,
    weekNote: store.weekNote,
    shifts: (myShifts[storeId] ?? []).map((shift) => ({
      shiftId: `shf_${storeId}_${toDateKey(shift.date)}`,
      date: toDateKey(shift.date),
      start: shift.start,
      end: shift.end,
      role: shift.role,
      crew: shift.crew,
    })),
  }
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
