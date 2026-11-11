import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createShiftTemplate,
  deleteShiftTemplate,
  getFixedSchedule,
  getOwnerCalendar,
  getOwnerReceivedRequests,
  getScheduleWorkers,
  getShiftTemplates,
  putDailySchedule,
  putFixedSchedule,
  resetDailySchedule,
  respondOwnerRequest,
  updateShiftTemplate,
} from '@/api/mocks/owner/schedule'
import { scheduleKeys } from '@/lib/api/schedule'
import { http, isRealApi } from '@/lib/api/source'
import type { ScheduleCalendar, ScheduleWorker } from '@/lib/api/types'
import { ApiError, apiFetch } from '@/lib/apiClient'
import type {
  FixedAssignment,
  OwnerSubstituteRequest,
  ShiftTemplate,
  ShiftTemplateInput,
  WeekShift,
} from '@/pages/owner/api/types'

/*
 * 사장님 고정 스케줄 훅 (11/10 회의: 추천 스케줄 대신 고정 근무 + 대타) — 담당: 나현
 * BE #31: /shift-templates(근무 타임) · /fixed-schedule(요일 × 타임 × 사람, PUT 은 매장 전체) · 사장님이 받은 대타 요청
 * 근무 달력은 민지의 lib/api/schedule useScheduleCalendar 를 그대로 쓴다.
 * .env VITE_REAL_API 의 'schedule' 스위치. 아니면 가짜 서버(api/mocks/owner/schedule — 알바 가짜 근무를 같이 고친다)
 */

const real = () => isRealApi('schedule')
const base = (storeId: string) => `/stores/${storeId}`

export const fixedKeys = {
  templates: (storeId: string) => ['owner', 'stores', storeId, 'shift-templates'] as const,
  fixed: (storeId: string) => ['owner', 'stores', storeId, 'fixed-schedule'] as const,
  received: (storeId: string) => ['owner', 'stores', storeId, 'substitute-received'] as const,
  workers: (storeId: string) => ['owner', 'stores', storeId, 'schedule-workers'] as const,
}

/** 고정 근무에 넣을 수 있는 사람: 사장님 · 코드로 입장한 직원 (입장 전 직원은 userId 가 없어서 빠진다) */
export function useScheduleWorkers(storeId: string) {
  return useQuery({
    queryKey: fixedKeys.workers(storeId),
    queryFn: async () => {
      const { workers } = real()
        ? await http.get<{ workers: ScheduleWorker[] }>(`${base(storeId)}/schedule-workers`)
        : await getScheduleWorkers(storeId)
      // 사장님을 맨 앞에
      return [...workers].sort((a, b) => (a.role === b.role ? 0 : a.role === 'owner' ? -1 : 1))
    },
  })
}

/** 근무가 바뀌면 사장님 · 알바 근무 달력 · 급여를 다시 불러온다 */
function useRefreshSchedule(storeId: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: fixedKeys.templates(storeId) }),
      queryClient.invalidateQueries({ queryKey: fixedKeys.fixed(storeId) }),
      queryClient.invalidateQueries({ queryKey: fixedKeys.received(storeId) }),
      queryClient.invalidateQueries({ queryKey: ['stores', storeId, 'schedule-calendar'] }),
      queryClient.invalidateQueries({ queryKey: ['owner', 'stores', storeId, 'payroll'] }),
      // 상단 종 알림의 대타 요청도 빠지게
      queryClient.invalidateQueries({ queryKey: ['owner', 'notifications'] }),
    ])
}

export function useShiftTemplates(storeId: string) {
  return useQuery({
    queryKey: fixedKeys.templates(storeId),
    queryFn: async () => {
      const { templates } = real()
        ? await http.get<{ templates: ShiftTemplate[] }>(`${base(storeId)}/shift-templates`)
        : await getShiftTemplates(storeId)
      return [...templates].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.start.localeCompare(b.start),
      )
    },
  })
}

/**
 * 근무 타임 저장: 처음(before)과 고친 목록(rows)을 비교해 뺀 것은 지우고 · 바뀐 것은 고치고 · 새 것은 만든다.
 * 지운 타임의 고정 근무는 BE 가 같이 지운다
 */
export function useSaveShiftTemplates(storeId: string) {
  const refresh = useRefreshSchedule(storeId)
  return useMutation({
    mutationFn: async ({
      before,
      rows,
    }: {
      before: ShiftTemplate[]
      rows: (ShiftTemplateInput & { templateId?: string })[]
    }) => {
      const kept = new Set(rows.map((r) => r.templateId).filter(Boolean))
      for (const t of before.filter((b) => !kept.has(b.templateId))) {
        if (real()) await http.delete(`${base(storeId)}/shift-templates/${t.templateId}`)
        else await deleteShiftTemplate(storeId, t.templateId)
      }
      for (const [i, row] of rows.entries()) {
        const body = { name: row.name, start: row.start, end: row.end, headcount: row.headcount }
        const old = before.find((b) => b.templateId === row.templateId)
        if (!old) {
          if (real()) await http.post(`${base(storeId)}/shift-templates`, { ...body, sortOrder: i })
          else await createShiftTemplate(storeId, body)
        } else if (
          old.name !== row.name ||
          old.start !== row.start ||
          old.end !== row.end ||
          old.headcount !== row.headcount ||
          old.sortOrder !== i
        ) {
          if (real()) {
            await http.patch(`${base(storeId)}/shift-templates/${old.templateId}`, {
              ...body,
              sortOrder: i,
            })
          } else await updateShiftTemplate(storeId, old.templateId, body)
        }
      }
    },
    onSettled: refresh,
  })
}

export function useFixedSchedule(storeId: string) {
  return useQuery({
    queryKey: fixedKeys.fixed(storeId),
    queryFn: async () => {
      const { assignments } = real()
        ? await http.get<{ assignments: FixedAssignment[] }>(`${base(storeId)}/fixed-schedule`)
        : await getFixedSchedule(storeId)
      return assignments
    },
  })
}

/**
 * 한 사람의 고정 근무 바꾸기. PUT /fixed-schedule 은 매장 전체를 바꿔서,
 * 다른 사람 근무(all 에서 이 사람 빼고)에 이 사람의 새 칸(shifts)을 더해 보낸다
 */
export function useSavePersonShifts(storeId: string) {
  const refresh = useRefreshSchedule(storeId)
  return useMutation({
    mutationFn: async ({
      userId,
      all,
      shifts,
    }: {
      userId: string
      all: FixedAssignment[]
      shifts: WeekShift[]
    }) => {
      const assignments = [
        ...all
          .filter((a) => a.assignee.userId !== userId)
          .map((a) => ({
            templateId: a.template.templateId,
            weekday: a.weekday,
            userId: a.assignee.userId,
          })),
        ...shifts.map((s) => ({ ...s, userId })),
      ]
      if (!real()) return putFixedSchedule(storeId, assignments)
      await apiFetch(`${base(storeId)}/fixed-schedule`, {
        method: 'PUT',
        body: JSON.stringify({
          assignments: assignments.map((a) => ({
            templateId: a.templateId,
            weekday: a.weekday,
            assigneeUserId: a.userId,
          })),
        }),
      })
    },
    onSettled: refresh,
  })
}

/** 직원이 사장님께 부탁한 대타 (대기 중만) — 근무 탭 카드 · 상단 종 알림이 같이 쓴다 */
export async function fetchOwnerReceived(storeId: string): Promise<OwnerSubstituteRequest[]> {
  const { requests } = real()
    ? await http.get<{ requests: OwnerSubstituteRequest[] }>(
        `${base(storeId)}/substitute-requests?box=received&status=PENDING`,
      )
    : await getOwnerReceivedRequests(storeId)
  return requests
}

export function useOwnerReceivedRequests(storeId: string) {
  return useQuery({
    queryKey: fixedKeys.received(storeId),
    queryFn: () => fetchOwnerReceived(storeId),
  })
}

export function useRespondOwnerRequest(storeId: string) {
  const refresh = useRefreshSchedule(storeId)
  return useMutation({
    mutationFn: ({ requestId, accept }: { requestId: string; accept: boolean }) =>
      real()
        ? http.post(
            `${base(storeId)}/substitute-requests/${requestId}/${accept ? 'accept' : 'reject'}`,
          )
        : respondOwnerRequest(storeId, requestId, accept),
    onSettled: refresh,
  })
}

// ── 사장님 근무 달력 · 하루 단위 근무 조정 (BE #38) ──

/**
 * 사장님 근무 달력: 진짜면 /schedule-calendar (민지 useScheduleCalendar 와 같은 API),
 * 가짜면 알바 가짜 달력 위에 사장님이 하루 조정한 근무를 덮는다 (api/mocks/owner/schedule).
 * 키는 민지 달력 키 뒤에 'owner' — 근무를 바꾸면 ['stores', storeId, 'schedule-calendar']로 같이 다시 불린다
 */
export function useOwnerCalendar(storeId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: [...scheduleKeys.calendar(storeId, startDate, endDate), 'owner'],
    queryFn: async (): Promise<ScheduleCalendar> => {
      if (!real()) return getOwnerCalendar(storeId, startDate, endDate)
      try {
        return await http.get<ScheduleCalendar>(
          `${base(storeId)}/schedule-calendar?startDate=${startDate}&endDate=${endDate}`,
        )
      } catch (error) {
        // 근무표를 아직 안 만든 매장 (없으면 빈 달력)
        if (error instanceof ApiError && error.status === 404)
          return { startDate, endDate, shifts: [] }
        throw error
      }
    },
    enabled: !!storeId,
  })
}

/**
 * 하루 근무 시간을 자유롭게 바꿀 수 있는지 — BE 하루 조정에 start · end 칸이 생기면(은교님께 요청 11/11) true 로.
 * 그 전에는 진짜 모드에서 근무 타임 시간으로만 저장한다 (가짜 서버는 바꾼 시간 그대로)
 */
const DAILY_TIME_IN_BE = false
export const canSetDailyTime = () => !real() || DAILY_TIME_IN_BE

/** 그날 남길 근무 전체로 바꾸기 (추가 · 담당자 · 시간 바꾸기 · 빼기). 고정 근무표는 그대로, 그날 대기 중 대타는 취소된다 */
export function useSaveDailySchedule(storeId: string) {
  const refresh = useRefreshSchedule(storeId)
  return useMutation({
    mutationFn: async ({
      date,
      shifts,
    }: {
      date: string
      shifts: { templateId: string; assigneeUserId: string; start: string; end: string }[]
    }) => {
      if (!real()) return putDailySchedule(storeId, date, shifts)
      await apiFetch(`${base(storeId)}/schedule-calendar/${date}`, {
        method: 'PUT',
        body: JSON.stringify({
          shifts: shifts.map(({ start, end, ...s }) =>
            DAILY_TIME_IN_BE ? { ...s, start, end } : s,
          ),
        }),
      })
    },
    onSettled: refresh,
  })
}

/** 그날 하루 조정을 지우고 고정 근무로 되돌리기 */
export function useResetDailySchedule(storeId: string) {
  const refresh = useRefreshSchedule(storeId)
  return useMutation({
    mutationFn: (date: string) =>
      real()
        ? http.delete<void>(`${base(storeId)}/schedule-calendar/${date}`)
        : resetDailySchedule(storeId, date),
    onSettled: refresh,
  })
}
