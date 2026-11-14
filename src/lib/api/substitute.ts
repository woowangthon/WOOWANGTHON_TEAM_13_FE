import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSubstituteRequest,
  getScheduleWorkers,
  getSubstituteRequests,
  respondSubstituteRequest,
} from '@/api/mocks/staff/api/schedule'
import { notificationKeys } from '@/lib/api/notifications'
import { payrollKeys } from '@/lib/api/payroll'
import { myUserId } from '@/lib/api/schedule'
import { http, isRealApi } from '@/lib/api/source'
import type {
  NewSubstituteRequest,
  ScheduleWorker,
  SubstituteRequest,
  SubstituteStatus,
} from '@/lib/api/types'
import { ApiError } from '@/lib/apiClient'

/*
 * 대타 훅 — 담당: 민지 (11/10 회의: 날짜 선택 → 변경 → 사람 지정 → 그 사람이 수락하면 이름이 바뀐다)
 * BE #31: GET /schedule-workers · GET|POST /substitute-requests · POST …/{requestId}/accept|reject (구성원 누구나)
 * .env VITE_REAL_API 의 'schedule' 스위치를 같이 쓴다. 아니면 가짜 서버(api/mocks/staff/api/schedule). docs/07 7-6
 * 대타 알림(요청 받음 · 수락됨)은 연서님 알림 API 가 나오면 알림 화면(챕터 D)에서 함께 보여 준다
 */

export type SubstituteBox = 'received' | 'sent'

export const substituteKeys = {
  all: (storeId: string) => ['stores', storeId, 'substitute-requests'] as const,
  list: (storeId: string, box: SubstituteBox) => [...substituteKeys.all(storeId), box] as const,
  workers: (storeId: string) => ['stores', storeId, 'schedule-workers'] as const,
}

const real = () => isRealApi('schedule')
const base = (storeId: string) => `/stores/${storeId}`

const fetchWorkers = (storeId: string) =>
  real()
    ? http.get<{ workers: ScheduleWorker[] }>(`${base(storeId)}/schedule-workers`)
    : getScheduleWorkers(storeId, myUserId())

const fetchRequests = (storeId: string, box: SubstituteBox, status?: SubstituteStatus) =>
  real()
    ? http.get<{ requests: SubstituteRequest[] }>(
        `${base(storeId)}/substitute-requests?box=${box}${status ? `&status=${status}` : ''}`,
      )
    : getSubstituteRequests(storeId, box, myUserId(), status)

/** 근무표의 사람 목록 (나 · 사장님 포함). 대타 시트는 나를 빼고 고르고, 알바 홈은 인수인계 작성자의 직원 이름을 찾는다 */
export function useScheduleWorkers(storeId: string, enabled = true) {
  return useQuery({
    queryKey: substituteKeys.workers(storeId),
    queryFn: () => fetchWorkers(storeId),
    enabled: enabled && !!storeId,
  })
}

/** 여러 매장의 근무표 사람 목록 (예상 급여 상세 카드의 사람 색). 같은 키라 근무표 탭에서 받은 게 있으면 그대로, 실패해도 토스트 없이 회색 */
export function useScheduleWorkersOf(storeIds: string[]) {
  return useQueries({
    queries: storeIds.map((storeId) => ({
      queryKey: substituteKeys.workers(storeId),
      queryFn: () => fetchWorkers(storeId),
      enabled: !!storeId,
      meta: { silent: true },
    })),
  })
}

/**
 * 받은 · 보낸 대타 요청 (최신 순). 받은 목록을 부르면 BE 가 읽음 처리한다.
 * enabled=false 면 부르지 않고 이미 받아 둔 것만 본다 (홈 배너: 홈을 열기만 해서 읽음 처리되지 않게)
 */
export function useSubstituteRequests(storeId: string, box: SubstituteBox, enabled = true) {
  return useQuery({
    queryKey: substituteKeys.list(storeId, box),
    queryFn: () => fetchRequests(storeId, box),
    enabled: enabled && !!storeId,
  })
}

/** 대타 요청 · 수락 뒤: 근무 달력 · 내 근무 · 대타 목록 · 예상 급여를 다시 불러온다 */
function useRefreshAfterSubstitute(storeId: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['stores', storeId, 'schedule-calendar'] }),
      queryClient.invalidateQueries({ queryKey: ['stores', storeId, 'schedules', 'me'] }),
      queryClient.invalidateQueries({ queryKey: substituteKeys.all(storeId) }),
      queryClient.invalidateQueries({ queryKey: payrollKeys.estimate(storeId) }),
      queryClient.invalidateQueries({ queryKey: notificationKeys.feed(storeId) }),
    ])
}

/** 대타 요청 보내기: 내 근무 · 오늘 이후만 */
export function useCreateSubstituteRequest(storeId: string) {
  const refresh = useRefreshAfterSubstitute(storeId)
  return useMutation({
    mutationFn: (body: NewSubstituteRequest) =>
      real()
        ? http.post<SubstituteRequest>(`${base(storeId)}/substitute-requests`, body)
        : createSubstituteRequest(storeId, body, myUserId()),
    onSettled: refresh,
  })
}

/** 받은 대타 요청 수락 · 거절 (수락하면 그날 그 근무가 내 이름으로 바뀐다) */
export function useRespondSubstitute(storeId: string) {
  const refresh = useRefreshAfterSubstitute(storeId)
  return useMutation({
    mutationFn: ({ requestId, accept }: { requestId: string; accept: boolean }) =>
      real()
        ? http.post<SubstituteRequest>(
            `${base(storeId)}/substitute-requests/${requestId}/${accept ? 'accept' : 'reject'}`,
          )
        : respondSubstituteRequest(storeId, requestId, accept, myUserId()),
    onSettled: refresh,
  })
}

/** BE 에러 코드 → 알아듣기 쉬운 문장 (모르는 코드면 BE 문장 · 화면 문장) */
const SUBSTITUTE_ERROR: Record<string, string> = {
  PAST_SHIFT: '이미 지난 근무라 대타를 요청할 수 없어요',
  NOT_ASSIGNEE: '내 근무에만 대타를 요청할 수 있어요',
  SUBSTITUTE_REQUEST_CONFLICT: '이미 진행 중이거나 처리된 대타 요청이에요',
  SUBSTITUTE_TIME_CONFLICT: '그 시간에 이미 근무가 있어서 맡을 수 없어요',
  INVALID_SUBSTITUTE: '이 사람에게는 대타를 맡길 수 없어요',
  NOT_SUBSTITUTE_TARGET: '나에게 온 요청만 수락하거나 거절할 수 있어요',
  SHIFT_NOT_FOUND: '그날 근무를 찾지 못했어요. 근무표를 다시 확인해 주세요',
  SUBSTITUTE_REQUEST_NOT_FOUND: '대타 요청을 찾지 못했어요',
}

export function substituteErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.code && SUBSTITUTE_ERROR[error.code]) {
    return SUBSTITUTE_ERROR[error.code]
  }
  return error instanceof ApiError && error.serverMessage ? error.serverMessage : fallback
}

/** 다시 해도 같은 결과인 에러 (토스트에 [다시 시도]를 붙이지 않는다) */
export const isFinalSubstituteError = (error: unknown) =>
  error instanceof ApiError && !!error.code && error.code in SUBSTITUTE_ERROR
