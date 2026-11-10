import {
  storeSchedules,
  type MockStoreSchedule,
  type MockWeeklyShift,
} from '@/api/mocks/staff/schedule'
import { ApiError } from '@/lib/apiClient'
import type { ScheduleWorker } from '@/lib/api/types'
import type {
  FixedAssignment,
  ShiftTemplate,
  ShiftTemplateInput,
  WeekShift,
} from '@/pages/owner/api/types'

/*
 * 가짜 서버: 사장님 고정 스케줄 (BE #31 /shift-templates · /fixed-schedule · 받은 대타) — 담당: 나현
 * 알바 가짜 근무(api/mocks/staff/schedule 의 storeSchedules)를 그대로 읽고 고친다 → 알바 근무표에도 바로 보인다.
 * 알바 데이터는 요일 0=일, 사장님 · BE 는 0=월 이라서 바꿔 준다.
 */

const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))
const toWeekday = (dow: number) => (dow + 6) % 7
const toDow = (weekday: number) => (weekday + 1) % 7

/** 매장마다 근무 타임 (처음 부를 때 알바 근무에서 이름 · 시간으로 만든다) */
const templatesByStore: Record<string, ShiftTemplate[]> = {}

const templateIdOf = (s: { name: string; start: string }) => `tpl_${s.name}_${s.start}`

function scheduleOf(storeId: string): MockStoreSchedule {
  storeSchedules[storeId] ??= {
    workers: [{ userId: 'usr_owner', name: '사장님', role: 'owner' }],
    weekly: [],
    substitutes: {},
  }
  return storeSchedules[storeId]
}

function templatesOf(storeId: string): ShiftTemplate[] {
  if (!templatesByStore[storeId]) {
    const seen = new Map<string, ShiftTemplate>()
    for (const w of scheduleOf(storeId).weekly) {
      const id = templateIdOf(w)
      if (!seen.has(id)) {
        // 시연 근무에 같은 이름 · 다른 시간(미들 13:00 · 15:00)이 있어서 겹치면 시간을 붙인다 (BE 는 이름이 겹칠 수 없음)
        const taken = [...seen.values()].some((t) => t.name === w.name)
        seen.set(id, {
          templateId: id,
          name: taken ? `${w.name} ${w.start}` : w.name,
          start: w.start,
          end: w.end,
          headcount: 1,
          sortOrder: seen.size,
        })
      }
    }
    templatesByStore[storeId] = [...seen.values()].sort((a, b) => a.start.localeCompare(b.start))
  }
  return templatesByStore[storeId]
}

/** 매장 등록 때 근무 타임을 만든다 (api.ts createStore) */
export function seedStoreShifts(storeId: string, inputs: ShiftTemplateInput[], ownerName: string) {
  storeSchedules[storeId] = {
    workers: [{ userId: 'usr_owner', name: ownerName, role: 'owner' }],
    weekly: [],
    substitutes: {},
  }
  templatesByStore[storeId] = inputs.map((t, i) => ({
    ...t,
    templateId: `tpl_${storeId}_${i}`,
    sortOrder: i,
  }))
}

const workerOf = (schedule: MockStoreSchedule, userId: string): ScheduleWorker => {
  const w = schedule.workers.find((x) => x.userId === userId)
  return {
    userId,
    memberId: w?.role === 'staff' ? `mbr_${userId}` : null,
    name: w?.name ?? '퇴사한 직원',
    role: w?.role ?? 'staff',
  }
}

/** GET /stores/{storeId}/schedule-workers — 고정 근무에 넣을 수 있는 사람 (사장님 · 입장한 직원) */
export async function getScheduleWorkers(storeId: string): Promise<{ workers: ScheduleWorker[] }> {
  await wait(150)
  const schedule = scheduleOf(storeId)
  return { workers: schedule.workers.map((w) => workerOf(schedule, w.userId)) }
}

/** GET /stores/{storeId}/shift-templates */
export async function getShiftTemplates(storeId: string): Promise<{ templates: ShiftTemplate[] }> {
  await wait(150)
  return { templates: templatesOf(storeId).map((t) => ({ ...t })) }
}

/** POST /stores/{storeId}/shift-templates */
export async function createShiftTemplate(
  storeId: string,
  input: ShiftTemplateInput,
): Promise<ShiftTemplate> {
  await wait()
  const list = templatesOf(storeId)
  if (list.some((t) => t.name === input.name)) {
    throw new ApiError(409, {
      code: 'SHIFT_TEMPLATE_EXISTS',
      message: '이미 있는 근무 이름이에요',
      detail: null,
    })
  }
  const template = {
    ...input,
    templateId: `tpl_${Date.now()}_${list.length}`,
    sortOrder: list.length,
  }
  list.push(template)
  return { ...template }
}

/** PATCH /stores/{storeId}/shift-templates/{templateId} — 그 타임 근무도 시간 · 이름이 바뀐다 */
export async function updateShiftTemplate(
  storeId: string,
  templateId: string,
  input: ShiftTemplateInput,
): Promise<ShiftTemplate> {
  await wait()
  const template = templatesOf(storeId).find((t) => t.templateId === templateId)
  if (!template) {
    throw new ApiError(404, {
      code: 'SHIFT_TEMPLATE_NOT_FOUND',
      message: '근무 타임을 찾지 못했어요',
      detail: null,
    })
  }
  for (const w of scheduleOf(storeId).weekly) {
    if (templateIdOf(w) === templateId || w.id.startsWith(`${templateId}|`)) {
      // 이름 · 시간이 바뀌어도 이 타임으로 찾을 수 있게 아이디를 "타임|사람"으로 맞춘다
      Object.assign(w, {
        id: `${templateId}|${w.worker}`,
        name: input.name,
        start: input.start,
        end: input.end,
      })
    }
  }
  Object.assign(template, input)
  return { ...template }
}

/** DELETE /stores/{storeId}/shift-templates/{templateId} — 그 타임 고정 근무도 같이 빠진다 */
export async function deleteShiftTemplate(storeId: string, templateId: string): Promise<void> {
  await wait()
  templatesByStore[storeId] = templatesOf(storeId).filter((t) => t.templateId !== templateId)
  const schedule = scheduleOf(storeId)
  schedule.weekly = schedule.weekly.filter(
    (w) => templateIdOf(w) !== templateId && !w.id.startsWith(`${templateId}|`),
  )
}

/** 알바 근무 한 줄의 근무 타임 (이름이 바뀌었어도 아이디로 찾는다) */
const templateOfWeekly = (storeId: string, w: MockWeeklyShift) =>
  templatesOf(storeId).find(
    (t) => w.id.startsWith(`${t.templateId}|`) || t.templateId === templateIdOf(w),
  )

/** GET /stores/{storeId}/fixed-schedule — 요일(0=월) × 근무 타임 × 담당자 */
export async function getFixedSchedule(
  storeId: string,
): Promise<{ assignments: FixedAssignment[] }> {
  await wait(150)
  const schedule = scheduleOf(storeId)
  const assignments: FixedAssignment[] = []
  for (const w of schedule.weekly) {
    const template = templateOfWeekly(storeId, w)
    if (!template) continue
    for (const dow of w.dows) {
      assignments.push({
        assignmentId: `${w.id}#${dow}`,
        template: { ...template },
        weekday: toWeekday(dow),
        assignee: workerOf(schedule, w.worker),
      })
    }
  }
  assignments.sort(
    (a, b) => a.weekday - b.weekday || a.template.start.localeCompare(b.template.start),
  )
  return { assignments }
}

/** PUT /stores/{storeId}/fixed-schedule — 매장 고정 근무 전체를 바꾼다 (타임 × 사람마다 요일을 모아 한 줄) */
export async function putFixedSchedule(
  storeId: string,
  assignments: (WeekShift & { userId: string })[],
): Promise<void> {
  await wait()
  const schedule = scheduleOf(storeId)
  const templates = templatesOf(storeId)
  const groups = new Map<string, MockWeeklyShift>()
  for (const a of assignments) {
    const t = templates.find((x) => x.templateId === a.templateId)
    if (!t) continue
    const key = `${t.templateId}|${a.userId}`
    const row = groups.get(key) ?? {
      id: key,
      name: t.name,
      start: t.start,
      end: t.end,
      role: '',
      dows: [],
      worker: a.userId,
    }
    row.dows.push(toDow(a.weekday))
    groups.set(key, row)
  }
  schedule.weekly = [...groups.values()]
  // 고정 근무가 바뀌면 지난 대타 칸은 근무 아이디가 달라져서 정리한다
  schedule.substitutes = {}
}

// ── 사장님이 받은 대타 요청 (시연: 도윤 → 사장님 1개) ──

interface OwnerRequest {
  requestId: string
  storeId: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  date: string
  shiftName: string
  start: string
  end: string
  requester: ScheduleWorker
  createdAt: string
}

const ownerRequests: OwnerRequest[] = [
  {
    requestId: 'sub_owner_1',
    storeId: 'dalbit',
    status: 'PENDING',
    date: '2026-11-22',
    shiftName: '마감',
    start: '18:00',
    end: '23:00',
    requester: { userId: 'usr_doyun', memberId: 'mbr_usr_doyun', name: '도윤', role: 'staff' },
    createdAt: '2026-11-20T02:10:00Z',
  },
]

/** GET /stores/{storeId}/substitute-requests?box=received&status=PENDING (사장님) */
export async function getOwnerReceivedRequests(storeId: string) {
  await wait(150)
  return {
    requests: ownerRequests
      .filter((r) => r.storeId === storeId && r.status === 'PENDING')
      .map((r) => ({ ...r })),
  }
}

/** POST …/substitute-requests/{requestId}/accept|reject (사장님) */
export async function respondOwnerRequest(storeId: string, requestId: string, accept: boolean) {
  await wait()
  const request = ownerRequests.find((r) => r.storeId === storeId && r.requestId === requestId)
  if (!request || request.status !== 'PENDING') {
    throw new ApiError(409, {
      code: 'SUBSTITUTE_REQUEST_CONFLICT',
      message: '이미 진행 중이거나 처리된 대타 요청이에요',
      detail: null,
    })
  }
  request.status = accept ? 'ACCEPTED' : 'REJECTED'
}
