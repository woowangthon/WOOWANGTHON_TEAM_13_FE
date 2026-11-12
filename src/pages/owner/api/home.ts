import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  answerOwnerQuestion,
  dismissNotification,
  draftManualFromAnswer,
  getNotifications,
  getOnDuty,
  getHandoverNotices,
  getOwnerQuestions,
  readHandoverNotices,
} from '@/api/mocks/owner/api'
import { manualKeys } from '@/lib/api/manuals'
import { http, isRealApi } from '@/lib/api/source'
import type { CalendarShift, NotificationFeed, ScheduleCalendar } from '@/lib/api/types'
import { ApiError } from '@/lib/apiClient'
import { fromDateKey, todayInKst, toDateKey } from '@/lib/date'
import { formatDate } from '@/lib/format'
import { fetchOwnerReceived } from '@/pages/owner/api/fixedSchedule'
import { fetchStores, ownerKeys } from '@/pages/owner/api/stores'
import { questionSentence } from '@/pages/owner/components/questionText'
import type {
  ManualDraft,
  OnDuty,
  OwnerAnswer,
  OwnerNotification,
  OwnerQuestionItem,
} from '@/pages/owner/api/types'

/*
 * 사장님 홈 · 알림 · 확인 필요 질문 훅 — 담당: 나현
 * 확인 필요 질문 · 답변은 .env VITE_REAL_API 에 'assistantChat'(사장님께 물어보기, + 'stores')을 넣으면 진짜 API.
 * 근무 중 · 재고 알림은 아직 가짜 서버만 (BE 미구현). 진짜 모드 알림에는 질문만 보인다.
 */

const fetchQuestions = (storeId: string): Promise<{ questions: OwnerQuestionItem[] }> =>
  isRealApi('assistantChat')
    ? http.get(`/stores/${storeId}/owner-questions?status=asked`)
    : getOwnerQuestions(storeId)

const postAnswer = (storeId: string, questionId: string, input: OwnerAnswer) =>
  isRealApi('assistantChat')
    ? http.post<OwnerQuestionItem>(
        `/stores/${storeId}/owner-questions/${questionId}/answer`,
        // 매뉴얼에 안 넣으면 제목 · 본문은 보내지 않는다
        input.addToManual ? input : { answer: input.answer, addToManual: false },
      )
    : answerOwnerQuestion(storeId, questionId, input)

// AI 매뉴얼 초안 (BE #37): 저장하지 않고 제목 · 본문만 받는다
const postManualDraft = (storeId: string, questionId: string, answer: string) =>
  isRealApi('assistantChat')
    ? http.post<ManualDraft>(`/stores/${storeId}/owner-questions/${questionId}/manual-draft`, {
        answer,
      })
    : draftManualFromAnswer(storeId, questionId, answer)

// 질문 알림: 진짜 모드는 내 매장마다 답하지 않은 질문을 모은다 (재고 알림은 BE 가 없어서 가짜 서버만)
const fetchQuestionNotifications = async (
  stores: { storeId: string; name: string }[],
): Promise<OwnerNotification[]> => {
  if (!isRealApi('assistantChat')) return (await getNotifications()).notifications
  const lists = await Promise.all(stores.map((store) => fetchQuestions(store.storeId)))
  return stores.flatMap((store, i) =>
    lists[i].questions.map<OwnerNotification>((q) => ({
      notificationId: `ntf_${q.questionId}`,
      storeId: store.storeId,
      storeName: store.name,
      kind: 'question',
      title: questionSentence(q.question, 14),
      sub: `${q.staffName} 님이 물어봤어요`,
      questionId: q.questionId,
      createdAt: q.askedAt,
    })),
  )
}

/*
 * 대타 알림: 직원이 사장님께 부탁한 대타(대기 중)를 매장마다 모은다.
 * BE 알림 API(#34)는 사장님께 대타 알림을 주지 않아서 대타 요청 목록에서 만든다. 누르면 그 매장 근무 탭에서 수락 · 거절
 */
const fetchSubstituteNotifications = async (
  stores: { storeId: string; name: string }[],
): Promise<OwnerNotification[]> => {
  // 한 매장이 실패해도 다른 알림은 보이게
  const lists = await Promise.all(
    stores.map((store) => fetchOwnerReceived(store.storeId).catch(() => [])),
  )
  return stores.flatMap((store, i) =>
    lists[i].map<OwnerNotification>((r) => ({
      notificationId: `sub_${r.requestId}`,
      storeId: store.storeId,
      storeName: store.name,
      kind: 'substitute',
      title: `${r.requester.name} 님이 대타를 부탁했어요`,
      sub: `${formatDate(fromDateKey(r.date))} · ${r.shiftName} ${r.start}~${r.end}`,
      questionId: null,
    })),
  )
}

/*
 * 인수인계 알림: BE 알림 API(#34)가 사장님께 주는 HANDOVER_CREATED (최근 14일, 다른 사람이 남긴 것 · 읽음 여부)
 * .env VITE_REAL_API 에 'notifications'. 아니면 가짜 서버. 알림 API 가 없으면(404) 빈 목록
 */
const fetchHandoverNotifications = async (
  stores: { storeId: string; name: string }[],
): Promise<OwnerNotification[]> => {
  const lists = await Promise.all(
    stores.map(async (store) => {
      try {
        if (!isRealApi('notifications')) return await getHandoverNotices(store.storeId)
        const feed = await http.get<NotificationFeed>(`/stores/${store.storeId}/notifications`)
        return feed.notifications.filter((n) => n.type === 'HANDOVER_CREATED')
      } catch {
        return []
      }
    }),
  )
  return stores.flatMap((store, i) =>
    lists[i].map<OwnerNotification>((n) => ({
      notificationId: n.notificationId,
      storeId: store.storeId,
      storeName: store.name,
      kind: 'handover',
      title: n.title,
      sub: n.body,
      questionId: null,
      isRead: n.isRead,
      createdAt: n.createdAt,
    })),
  )
}

// 처리할 것(대타 · 질문) 먼저, 그다음 인수인계
const fetchNotifications = async (): Promise<{ notifications: OwnerNotification[] }> => {
  const { stores } = await fetchStores()
  const [questions, substitutes, handovers] = await Promise.all([
    fetchQuestionNotifications(stores),
    fetchSubstituteNotifications(stores),
    fetchHandoverNotifications(stores),
  ])
  return { notifications: [...substitutes, ...questions, ...handovers] }
}

/** 종을 열면 안 읽은 인수인계가 있는 매장의 알림을 읽음으로 (BE POST /notifications/read — 매장마다 전부) */
export function useReadHandoverNotifications() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (storeIds: string[]) => {
      await Promise.all(
        storeIds.map((storeId) =>
          isRealApi('notifications')
            ? http.post<void>(`/stores/${storeId}/notifications/read`)
            : readHandoverNotices(storeId),
        ),
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ownerKeys.notifications }),
  })
}

/** 한국 시간 지금 "HH:MM" */
const nowInKst = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16)

/**
 * 지금 근무 중인 사람 (직원 · 사장님 모두): 오늘 근무 달력에서 시작 ≤ 지금 < 끝 인 칸 (하루 조정 · 대타 반영된 BE 달력 그대로)
 * 진짜는 'schedule' 스위치를 따른다. 1분마다 다시 계산
 */
const fetchOnDuty = async (storeId: string): Promise<{ people: OnDuty[] }> => {
  if (!isRealApi('schedule')) return getOnDuty(storeId)
  const today = toDateKey(todayInKst())
  let shifts: CalendarShift[] = []
  try {
    ;({ shifts } = await http.get<ScheduleCalendar>(
      `/stores/${storeId}/schedule-calendar?startDate=${today}&endDate=${today}`,
    ))
  } catch (error) {
    // 근무표를 아직 안 만든 매장
    if (!(error instanceof ApiError && error.status === 404)) throw error
  }
  const now = nowInKst()
  // 한 사람이 겹치는 칸에 두 번 나오면 한 번만
  const byUser = new Map<string, OnDuty>()
  for (const s of shifts) {
    if (s.date !== today || s.start > now || now >= s.end || byUser.has(s.assignee.userId)) continue
    byUser.set(s.assignee.userId, {
      userId: s.assignee.userId,
      name: s.assignee.name,
      isOwner: s.assignee.role === 'owner',
      shiftName: s.name,
      start: s.start,
      end: s.end,
    })
  }
  return { people: [...byUser.values()] }
}

export function useOnDuty(storeId: string) {
  return useQuery({
    queryKey: ownerKeys.onDuty(storeId),
    queryFn: () => fetchOnDuty(storeId),
    enabled: !!storeId,
    refetchInterval: 60_000,
  })
}

/** 알바생이 [사장님께 물어보기]로 보낸 질문 중 아직 답하지 않은 것 (docs/03 S5) */
export function useOwnerQuestions(storeId: string) {
  return useQuery({
    queryKey: ownerKeys.questions(storeId),
    queryFn: () => fetchQuestions(storeId),
    enabled: !!storeId,
  })
}

/** 모든 내 매장의 알림 (상단 종) */
export function useNotifications() {
  return useQuery({ queryKey: ownerKeys.notifications, queryFn: fetchNotifications })
}

export function useDismissNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: dismissNotification,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ownerKeys.notifications }),
  })
}

/** 사장님 답변을 AI 로 매뉴얼 제목 · 본문 초안으로 정리한다 (저장 안 함, 2~5초) */
export function useManualDraft(storeId: string) {
  return useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer: string }) =>
      postManualDraft(storeId, questionId, answer),
  })
}

/** 답하기 (+ 매뉴얼에 추가하면 알바 화면 매뉴얼 · AI 답변에도 반영) */
export function useAnswerQuestion(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ questionId, ...input }: OwnerAnswer & { questionId: string }) =>
      postAnswer(storeId, questionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.questions(storeId) })
      queryClient.invalidateQueries({ queryKey: ownerKeys.notifications })
      queryClient.invalidateQueries({ queryKey: manualKeys.list(storeId) })
    },
    // 다른 기기에서 이미 답했으면 (409 OWNER_QUESTION_ALREADY_ANSWERED) 목록을 새로 불러 빼 준다
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'OWNER_QUESTION_ALREADY_ANSWERED') {
        queryClient.invalidateQueries({ queryKey: ownerKeys.questions(storeId) })
        queryClient.invalidateQueries({ queryKey: ownerKeys.notifications })
      }
    },
  })
}

/** BE 하루 인수인계 AI 요약 (GET /stores/{storeId}/handover-summary?date=, BE #41) — 인수인계가 없으면 summary null */
interface HandoverDaySummary {
  date: string
  summary: string | null
  noteCount: number
}

/**
 * 그날 인수인계 전체를 AI 가 2~4문장으로 요약 (진짜 'handover' 일 때만). 가짜 서버 · 실패(503 AI_UNAVAILABLE)면 null → 화면이 노트 요약을 이어 붙여 보여 준다.
 * noteKey(그날 노트 ID 들)가 바뀌면 새 인수인계가 생긴 것이라 다시 부른다 (BE 가 같은 내용이면 캐시로 돌려준다)
 */
export function useHandoverDaySummary(storeId: string, date: string, noteKey: string) {
  return useQuery({
    queryKey: ['owner', 'stores', storeId, 'handover-summary', date, noteKey] as const,
    queryFn: async () => {
      const data = await http.get<HandoverDaySummary>(
        `/stores/${storeId}/handover-summary?date=${date}`,
      )
      return data.summary?.trim() || null
    },
    enabled: !!storeId && !!noteKey && isRealApi('handover'),
    retry: false,
    staleTime: 5 * 60_000,
  })
}
