import { getDayMemos } from '@/api/mocks/owner/api'
import { http } from '@/lib/api/source'
import { ApiError } from '@/lib/apiClient'
import { addDays, fromDateKey, toDateKey, todayInKst } from '@/lib/date'
import type {
  AvailabilityStatus,
  AvailabilitySubmissions,
  DraftRow,
  MonthShifts,
  RecommendationDetail,
  RecommendationSummary,
  ScheduleDraft,
  ScheduleResponse,
  WorkShift,
} from '@/pages/owner/api/types'

/*
 * 사장님 근무 · 추천 스케줄 진짜 API (BE #24 · #22) — 담당: 나현
 * work.ts 훅이 .env VITE_REAL_API 에 'schedule' · 'availability'가 있을 때 여기를 부른다. 화면 모양은 가짜 서버와 같다.
 * - 추천: 다음 달(알바생이 근무 가능 시간을 내는 달) 매일 기본 근무 칸(DEFAULT_SLOTS)을 보내고,
 *   후보 중 못 채운 칸이 가장 적은 것을 보여 준다. BE 는 그 날 "가능"을 낸 직원만 배정한다
 * - 확정: 그 추천으로 근무표를 만들고 바로 공개 (POST /schedules)
 * - 달력: 그 달에 겹치는 근무표의 칸 · 배정을 한 사람씩 펼친다. 추가 · 삭제는 근무표 칸 전체를 다시 보낸다 (PATCH)
 *   근무표가 없는 달에 추가하면 그 달 "추가 근무" 근무표를 먼저 만든다 (BE 는 추천 없이 근무표를 못 만들어서 칸 1개짜리 추천으로)
 * - 사장님 배정 · 날짜 메모는 BE 가 없어서 각각 막음 · 이 브라우저에만 저장
 */

/** 추천에 보내는 하루 기본 근무 칸 (시간 · 인원 바꾸는 화면은 P2) */
const DEFAULT_SLOTS = [
  { role: '오픈', start: '09:00', end: '15:00', requiredStaff: 1 },
  { role: '마감', start: '15:00', end: '22:00', requiredStaff: 2 },
]

/** 근무표가 없는 달에 근무를 넣을 때 자동으로 만드는 근무표 이름 끝 (추천 카드에서는 뺀다) */
const EXTRA_SUFFIX = '추가 근무'

const OWNER_NOT_SUPPORTED = new ApiError(400, {
  code: 'OWNER_SHIFT_NOT_SUPPORTED',
  message: '사장님 근무는 아직 저장할 수 없어요',
  detail: null,
})

/** 한 달 (1일 ~ 말일) */
function monthRange(first: Date) {
  const last = addDays(new Date(first.getFullYear(), first.getMonth() + 1, 1), -1)
  return {
    start: toDateKey(first),
    end: toDateKey(last),
    label: `${first.getMonth() + 1}월`,
    days: Array.from({ length: last.getDate() }, (_, i) => toDateKey(addDays(first, i))),
  }
}

/** 다음 달 = 근무 가능 시간 제출 · 추천 스케줄 대상 달 */
function nextMonth() {
  const today = todayInKst()
  return monthRange(new Date(today.getFullYear(), today.getMonth() + 1, 1))
}

const minutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const hoursBetween = (start: string, end: string) => (minutes(end) - minutes(start)) / 60

type Slot = {
  date: string
  role: string
  requiredStaff?: number
  assignments: { staffName: string }[]
}

/** 날짜별 오픈 · 마감 이름과 부족 인원 (화면 DraftRow) */
function toRows(days: string[], slots: Slot[]): DraftRow[] {
  return days.map((date) => {
    const of = (role: string) => slots.filter((s) => s.date === date && s.role === role)
    const names = (role: string) => of(role).flatMap((s) => s.assignments.map((a) => a.staffName))
    const missing = (role: string) =>
      of(role).reduce(
        (sum, s) => sum + Math.max(0, (s.requiredStaff ?? 0) - s.assignments.length),
        0,
      )
    return {
      date,
      open: names('오픈'),
      close: names('마감'),
      shortage: missing('마감'),
      openShortage: missing('오픈'),
    }
  })
}

const listSchedules = (storeId: string, startDate: string, endDate: string) =>
  http
    .get<{ schedules: ScheduleResponse[] }>(
      `/stores/${storeId}/schedules?startDate=${startDate}&endDate=${endDate}`,
    )
    .then((data) => data.schedules)

/** 다음 달 추천 스케줄 (없으면 none, 확정했으면 confirmed) */
export async function fetchDraft(storeId: string): Promise<ScheduleDraft> {
  const week = nextMonth()
  const [{ recommendations }, schedules] = await Promise.all([
    http.get<{ recommendations: RecommendationSummary[] }>(
      `/stores/${storeId}/schedule-recommendations`,
    ),
    listSchedules(storeId, week.start, week.end),
  ])
  // "추가 근무" 근무표를 만들 때 쓴 칸 1개짜리 추천은 추천 카드에서 뺀다
  const extraIds = new Set(
    schedules.filter((s) => s.name.endsWith(EXTRA_SUFFIX)).map((s) => s.recommendationId),
  )
  const thisWeek = recommendations
    .filter((r) => r.startDate === week.start && !extraIds.has(r.recommendationId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (thisWeek.length === 0) return { weekLabel: week.label, status: 'none', rows: [] }

  // 가장 최근에 만든 묶음에서 못 채운 칸이 가장 적은 후보
  const batch = thisWeek.filter((r) => r.batchId === thisWeek[0].batchId)
  const best = [...batch].sort(
    (a, b) => a.unfilledSlots - b.unfilledSlots || a.candidateNo - b.candidateNo,
  )[0]
  const detail = await http.get<RecommendationDetail>(
    `/stores/${storeId}/schedule-recommendations/${best.recommendationId}`,
  )

  const batchIds = new Set(batch.map((r) => r.recommendationId))
  const confirmed = schedules.find((s) => s.recommendationId && batchIds.has(s.recommendationId))
  if (confirmed) {
    // 확정한 근무표 기준으로 보여 주고, 필요 인원은 추천 칸에서 가져온다
    const required = (date: string, role: string) =>
      detail.shifts.find((s) => s.date === date && s.role === role)?.requiredStaff
    return {
      weekLabel: week.label,
      status: 'confirmed',
      rows: toRows(
        week.days,
        confirmed.shifts.map((s) => ({ ...s, requiredStaff: required(s.date, s.role) })),
      ),
    }
  }
  return {
    weekLabel: week.label,
    status: 'draft',
    rows: toRows(week.days, detail.shifts),
    recommendationId: detail.recommendationId,
  }
}

/** 추천 스케줄 만들기: 다음 달 매일 기본 근무 칸 → 후보 3개 */
export async function createDraft(storeId: string): Promise<ScheduleDraft> {
  const week = nextMonth()
  await http.post(`/stores/${storeId}/schedule-recommendations`, {
    startDate: week.start,
    endDate: week.end,
    recommendationCount: 3,
    shifts: week.days.flatMap((date) => DEFAULT_SLOTS.map((slot) => ({ date, ...slot }))),
  })
  return fetchDraft(storeId)
}

/** 확정하고 알리기: 추천으로 근무표를 만들고 바로 공개 */
export async function confirmDraft(storeId: string, draft: ScheduleDraft): Promise<ScheduleDraft> {
  if (!draft.recommendationId) throw new Error('추천 스케줄을 먼저 만들어 주세요')
  await http.post(`/stores/${storeId}/schedules`, {
    recommendationId: draft.recommendationId,
    name: `${draft.weekLabel} 근무표`,
    publish: true,
  })
  return fetchDraft(storeId)
}

/** 부족한 칸에 사장님 배정 — BE 가 사장님 배정을 지원하기 전까지 막는다 */
export async function fillDraft(): Promise<ScheduleDraft> {
  throw OWNER_NOT_SUPPORTED
}

/** 한 달 근무 달력: 겹치는 근무표의 칸을 배정된 사람마다 한 줄로 */
export async function fetchMonthShifts(storeId: string, month: string): Promise<MonthShifts> {
  const first = fromDateKey(`${month}-01`)
  const last = addDays(new Date(first.getFullYear(), first.getMonth() + 1, 1), -1)
  const [schedules, memos] = await Promise.all([
    listSchedules(storeId, toDateKey(first), toDateKey(last)),
    getDayMemos(storeId, month),
  ])
  const shifts: WorkShift[] = schedules
    .flatMap((schedule) =>
      schedule.shifts
        .filter((s) => s.date.startsWith(month))
        .flatMap((s) =>
          s.assignments.map((a) => ({
            shiftId: `${schedule.scheduleId}|${s.shiftId}|${a.memberId}`,
            date: s.date,
            memberId: a.memberId,
            name: a.staffName,
            start: s.start,
            end: s.end,
            hours: hoursBetween(s.start, s.end),
          })),
        ),
    )
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  return { month, shifts, memos }
}

type ShiftUpdate = {
  date: string
  start: string
  end: string
  role: string
  assignedMemberIds: string[]
}

const toUpdates = (schedule: ScheduleResponse): (ShiftUpdate & { shiftId: string })[] =>
  schedule.shifts.map((s) => ({
    shiftId: s.shiftId,
    date: s.date,
    start: s.start,
    end: s.end,
    role: s.role,
    assignedMemberIds: s.assignments.map((a) => a.memberId),
  }))

const saveShifts = (storeId: string, scheduleId: string, shifts: ShiftUpdate[]) =>
  http.patch(`/stores/${storeId}/schedules/${scheduleId}`, {
    shifts: shifts.map(({ date, start, end, role, assignedMemberIds }) => ({
      date,
      start,
      end,
      role,
      assignedMemberIds,
    })),
  })

/** 근무 추가: 그 날짜가 들어 있는 근무표(공개한 것 먼저)에 칸을 하나 더한다 */
export async function addShift(
  storeId: string,
  input: { date: string; memberId: string; start: string; end: string },
): Promise<void> {
  if (input.memberId === 'owner') throw OWNER_NOT_SUPPORTED
  if (minutes(input.end) <= minutes(input.start)) {
    throw new ApiError(422, {
      code: 'VALIDATION_ERROR',
      message: '끝나는 시간은 시작 시간 뒤여야 해요',
      detail: null,
    })
  }
  const schedules = await listSchedules(storeId, input.date, input.date)
  const schedule =
    schedules.find((s) => s.status === 'published') ??
    schedules.find((s) => s.status === 'draft') ??
    (await createExtraSchedule(storeId, input))
  await saveShifts(storeId, schedule.scheduleId, [
    ...toUpdates(schedule),
    { ...input, role: '', assignedMemberIds: [input.memberId] },
  ])
}

/**
 * 근무표가 없는 달에 근무를 넣을 때: 그 달 전체를 덮는 "○월 추가 근무" 근무표를 만든다.
 * BE 는 추천으로만 근무표를 만들 수 있어서 칸 1개짜리 추천을 만든 뒤 확정한다.
 * 추천이 넣은 사람은 바로 다음 PATCH 에서 고른 사람으로 바뀐다.
 */
async function createExtraSchedule(
  storeId: string,
  input: { date: string; start: string; end: string },
): Promise<ScheduleResponse> {
  const month = monthRange(fromDateKey(`${input.date.slice(0, 7)}-01`))
  const created = await http.post<{ recommendations: RecommendationDetail[] }>(
    `/stores/${storeId}/schedule-recommendations`,
    {
      startDate: month.start,
      endDate: month.end,
      recommendationCount: 1,
      shifts: [
        { date: input.date, start: input.start, end: input.end, role: '', requiredStaff: 1 },
      ],
    },
  )
  const schedule = await http.post<ScheduleResponse>(`/stores/${storeId}/schedules`, {
    recommendationId: created.recommendations[0].recommendationId,
    name: `${month.label} ${EXTRA_SUFFIX}`,
    publish: true,
  })
  // 추천이 만든 칸은 지우고 고른 사람으로 다시 넣는다 (addShift 가 이어서 PATCH)
  return { ...schedule, shifts: [] }
}

/** 근무 삭제: 그 칸에서 이 사람만 빼고, 아무도 안 남으면 칸도 뺀다 */
export async function deleteShift(storeId: string, id: string): Promise<void> {
  const [scheduleId, shiftId, memberId] = id.split('|')
  const { schedules } = await http.get<{ schedules: ScheduleResponse[] }>(
    `/stores/${storeId}/schedules`,
  )
  const schedule = schedules.find((s) => s.scheduleId === scheduleId)
  if (!schedule) return
  const shifts = toUpdates(schedule)
    .map((s) =>
      s.shiftId === shiftId
        ? { ...s, assignedMemberIds: s.assignedMemberIds.filter((m) => m !== memberId) }
        : s,
    )
    .filter((s) => s.shiftId !== shiftId || s.assignedMemberIds.length > 0)
  await saveShifts(storeId, scheduleId, shifts)
}

/** 다음 달 근무 가능 시간 제출 현황 */
export async function fetchAvailabilityStatus(storeId: string): Promise<AvailabilityStatus> {
  const today = todayInKst()
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const month = toDateKey(next).slice(0, 7)
  const data = await http.get<AvailabilitySubmissions>(
    `/stores/${storeId}/availability-submissions?month=${month}`,
  )
  return {
    month: data.month,
    deadline: data.deadline,
    submitted: data.submittedCount,
    total: data.totalMembers,
    missing: data.members.filter((m) => !m.submitted).map((m) => m.staffName),
  }
}
