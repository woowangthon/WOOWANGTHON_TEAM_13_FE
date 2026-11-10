import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createShiftTemplate,
  deleteShiftTemplate,
  getFixedSchedule,
  getOwnerReceivedRequests,
  getScheduleWorkers,
  getShiftTemplates,
  putFixedSchedule,
  respondOwnerRequest,
  updateShiftTemplate,
} from '@/api/mocks/owner/schedule'
import { http, isRealApi } from '@/lib/api/source'
import { apiFetch } from '@/lib/apiClient'
import type { ScheduleWorker } from '@/lib/api/types'
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

/** 직원이 사장님께 부탁한 대타 (대기 중만) */
export function useOwnerReceivedRequests(storeId: string) {
  return useQuery({
    queryKey: fixedKeys.received(storeId),
    queryFn: async (): Promise<OwnerSubstituteRequest[]> => {
      const { requests } = real()
        ? await http.get<{ requests: OwnerSubstituteRequest[] }>(
            `${base(storeId)}/substitute-requests?box=received&status=PENDING`,
          )
        : await getOwnerReceivedRequests(storeId)
      return requests
    },
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
