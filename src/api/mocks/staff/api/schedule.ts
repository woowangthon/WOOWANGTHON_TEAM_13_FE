import {
  availabilityMonth,
  initialAvailability,
  initialAvailabilityMemo,
  myShifts,
} from '@/api/mocks/staff/schedule'
import { findStaffStore } from '@/api/mocks/staff/stores'
import { toDateKey } from '@/lib/date'
import type { AvailabilityInput, MyAvailability, MySchedule } from '@/lib/api/types'

// 가짜 서버: 근무 API (docs/07 7, 경로 제안) — 시연 날짜는 매장마다 다르다 (달빛 카페 11/20 · 오후의 커피 11/21)

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
const availability = new Map<string, MyAvailability>() // storeId → 제출 내용

function initial(): MyAvailability {
  return {
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

/** GET /stores/{storeId}/availability/me */
export async function getMyAvailability(storeId: string): Promise<MyAvailability> {
  return availability.get(storeId) ?? initial()
}

/** PUT /stores/{storeId}/availability/me — 제출 (다시 내면 덮어쓴다) */
export async function putMyAvailability(
  storeId: string,
  body: AvailabilityInput,
): Promise<MyAvailability> {
  const saved: MyAvailability = {
    ...(availability.get(storeId) ?? initial()),
    days: body.days,
    memo: body.memo,
    submittedAt: new Date().toISOString(),
  }
  availability.set(storeId, saved)
  return saved
}
