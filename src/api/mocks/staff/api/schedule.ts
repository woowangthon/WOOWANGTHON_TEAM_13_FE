import { storeSchedules } from '@/api/mocks/staff/schedule'
import { findStaffStore } from '@/api/mocks/staff/stores'
import { fromDateKey, toDateKey } from '@/lib/date'
import { ApiError } from '@/lib/apiClient'
import type {
  CalendarShift,
  NewSubstituteRequest,
  ScheduleCalendar,
  ScheduleWorker,
  SubstituteRequest,
  SubstituteStatus,
} from '@/lib/api/types'

// 가짜 서버: 근무 API (docs/07 7) — 공유 근무 달력 · 대타 요청. 시연 날짜는 매장마다 다르다 (달빛 카페 11/20 · 오후의 커피 11/21)

/** 실제 BE 와 같게: 사장님은 구성원(member)이 아니라서 memberId null */
const mockMemberId = (worker: { userId: string; role: ScheduleWorker['role'] }) =>
  worker.role === 'owner' ? null : `mbr_${worker.userId}`

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
          memberId: mockMemberId(worker),
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

// ── 대타 (BE #31: schedule-workers · substitute-requests) ──

interface MockSubstituteRequest {
  requestId: string
  storeId: string
  status: SubstituteStatus
  date: string
  assignmentId: string
  /** 'me' 는 로그인한 사람 */
  requester: string
  target: string
  read: boolean
  createdAt: string
  respondedAt: string | null
}

/** 시연: 받은 요청 1개(도윤 → 나, 대기) · 보낸 요청 2개(나 → 서연 대기, 나 → 민수 수락됨 = 11/25 대타) */
const substituteRequests: MockSubstituteRequest[] = [
  {
    requestId: 'sub_from_doyun',
    storeId: 'dalbit',
    status: 'PENDING',
    date: '2026-11-24',
    assignmentId: 'asg_close_doyun',
    requester: 'usr_doyun',
    target: 'me',
    read: false,
    createdAt: '2026-11-20T10:12:00+09:00',
    respondedAt: null,
  },
  {
    requestId: 'sub_to_seoyeon',
    storeId: 'dalbit',
    status: 'PENDING',
    date: '2026-11-23',
    assignmentId: 'asg_close_me',
    requester: 'me',
    target: 'usr_seoyeon',
    read: false,
    createdAt: '2026-11-19T21:40:00+09:00',
    respondedAt: null,
  },
  {
    requestId: 'sub_to_minsu',
    storeId: 'dalbit',
    status: 'ACCEPTED',
    date: '2026-11-25',
    assignmentId: 'asg_close_me',
    requester: 'me',
    target: 'usr_minsu',
    read: true,
    createdAt: '2026-11-18T13:05:00+09:00',
    respondedAt: '2026-11-18T15:30:00+09:00',
  },
]
let substituteSeq = 0

function subError(status: number, code: string, message: string): never {
  throw new ApiError(status, { code, message, detail: null })
}

function workerIn(storeId: string, userId: string, myUserId: string): ScheduleWorker {
  const worker = storeSchedules[storeId]?.workers.find((w) => w.userId === userId)
  const id = userId === 'me' ? myUserId : userId
  return worker
    ? { userId: id, memberId: mockMemberId(worker), name: worker.name, role: worker.role }
    : { userId: id, memberId: null, name: '퇴사한 직원', role: 'staff' }
}

/** 화면이 보내는 진짜 userId → 가짜 데이터의 id ('me') */
const rawId = (userId: string, myUserId: string) => (userId === myUserId ? 'me' : userId)

function toSubstituteResponse(item: MockSubstituteRequest, myUserId: string): SubstituteRequest {
  const shift = storeSchedules[item.storeId]?.weekly.find((w) => w.id === item.assignmentId)
  return {
    requestId: item.requestId,
    status: item.status,
    date: item.date,
    assignmentId: item.assignmentId,
    shiftName: shift?.name ?? '근무',
    start: shift?.start ?? '',
    end: shift?.end ?? '',
    requester: workerIn(item.storeId, item.requester, myUserId),
    target: workerIn(item.storeId, item.target, myUserId),
    isRead: item.read,
    createdAt: item.createdAt,
    respondedAt: item.respondedAt,
  }
}

/** GET /stores/{storeId}/schedule-workers — 대타로 고를 수 있는 사람 (나 · 사장님 포함, 화면이 나를 뺀다) */
export async function getScheduleWorkers(
  storeId: string,
  myUserId: string,
): Promise<{ workers: ScheduleWorker[] }> {
  return {
    workers: (storeSchedules[storeId]?.workers ?? []).map((w) =>
      workerIn(storeId, w.userId, myUserId),
    ),
  }
}

/** GET /stores/{storeId}/substitute-requests?box=received|sent&status= — 받은 목록을 부르면 읽음 처리 */
export async function getSubstituteRequests(
  storeId: string,
  box: 'received' | 'sent',
  myUserId: string,
  status?: SubstituteStatus,
): Promise<{ requests: SubstituteRequest[] }> {
  const mine = substituteRequests.filter(
    (r) =>
      r.storeId === storeId &&
      (box === 'received' ? r.target === 'me' : r.requester === 'me') &&
      (!status || r.status === status),
  )
  if (box === 'received') mine.forEach((r) => (r.read = true))
  return {
    requests: [...mine]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => toSubstituteResponse(r, myUserId)),
  }
}

/** 그날 그 근무를 실제로 하는 사람 (대타 반영) */
function assigneeOn(storeId: string, assignmentId: string, date: string) {
  const schedule = storeSchedules[storeId]
  const shift = schedule?.weekly.find((w) => w.id === assignmentId)
  if (!schedule || !shift || !shift.dows.includes(fromDateKey(date).getDay())) return null
  return { shift, worker: schedule.substitutes[`${assignmentId}|${date}`] ?? shift.worker }
}

/** POST /stores/{storeId}/substitute-requests — 내 근무 · 오늘 이후 · 진행 중 요청 없음 · 상대 시간 안 겹침 */
export async function createSubstituteRequest(
  storeId: string,
  body: NewSubstituteRequest,
  myUserId: string,
): Promise<SubstituteRequest> {
  const found = assigneeOn(storeId, body.assignmentId, body.date)
  if (!found) subError(404, 'SHIFT_NOT_FOUND', '해당 날짜의 근무를 찾을 수 없어요')
  const target = rawId(body.targetUserId, myUserId)
  const schedule = storeSchedules[storeId]
  if (target === 'me' || !schedule.workers.some((w) => w.userId === target)) {
    subError(422, 'INVALID_SUBSTITUTE', '대타로 지정할 수 없는 사용자예요')
  }
  if (body.date < toDateKey(findStaffStore(storeId).today)) {
    subError(422, 'PAST_SHIFT', '지난 근무에는 대타를 요청할 수 없어요')
  }
  if (found.worker !== 'me') subError(403, 'NOT_ASSIGNEE', '현재 근무자만 대타를 요청할 수 있어요')
  const pending = substituteRequests.some(
    (r) =>
      r.storeId === storeId &&
      r.assignmentId === body.assignmentId &&
      r.date === body.date &&
      r.status === 'PENDING',
  )
  if (pending) subError(409, 'SUBSTITUTE_REQUEST_CONFLICT', '이미 진행 중인 대타 요청이 있어요')
  const busy = schedule.weekly.some((w) => {
    const on = assigneeOn(storeId, w.id, body.date)
    return on?.worker === target && w.start < found.shift.end && found.shift.start < w.end
  })
  if (busy) subError(409, 'SUBSTITUTE_TIME_CONFLICT', '상대방의 근무 시간이 겹쳐요')
  const item: MockSubstituteRequest = {
    requestId: `sub_new_${++substituteSeq}`,
    storeId,
    status: 'PENDING',
    date: body.date,
    assignmentId: body.assignmentId,
    requester: 'me',
    target,
    read: false,
    createdAt: new Date().toISOString(),
    respondedAt: null,
  }
  substituteRequests.push(item)
  return toSubstituteResponse(item, myUserId)
}

/** POST …/substitute-requests/{requestId}/accept | reject — 수락하면 그날 그 근무가 내 이름으로 바뀐다 */
export async function respondSubstituteRequest(
  storeId: string,
  requestId: string,
  accept: boolean,
  myUserId: string,
): Promise<SubstituteRequest> {
  const item = substituteRequests.find((r) => r.storeId === storeId && r.requestId === requestId)
  if (!item) subError(404, 'SUBSTITUTE_REQUEST_NOT_FOUND', '대타 요청을 찾을 수 없어요')
  if (item.target !== 'me')
    subError(403, 'NOT_SUBSTITUTE_TARGET', '요청받은 사람만 응답할 수 있어요')
  const found = assigneeOn(storeId, item.assignmentId, item.date)
  if (item.status !== 'PENDING' || found?.worker !== item.requester) {
    subError(409, 'SUBSTITUTE_REQUEST_CONFLICT', '이미 처리됐거나 근무자가 변경됐어요')
  }
  item.status = accept ? 'ACCEPTED' : 'REJECTED'
  item.respondedAt = new Date().toISOString()
  item.read = true
  if (accept) storeSchedules[storeId].substitutes[`${item.assignmentId}|${item.date}`] = 'me'
  return toSubstituteResponse(item, myUserId)
}
