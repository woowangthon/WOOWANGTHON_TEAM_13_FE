import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  answerOwnerQuestion,
  dismissNotification,
  getNotifications,
  getOnDuty,
  getOwnerQuestions,
} from '@/api/mocks/owner/api'
import { manualKeys } from '@/lib/api/manuals'
import { http, isRealApi } from '@/lib/api/source'
import { ApiError } from '@/lib/apiClient'
import { formatTime } from '@/lib/format'
import { fetchStores, ownerKeys } from '@/pages/owner/api/stores'
import type { OwnerAnswer, OwnerNotification, OwnerQuestionItem } from '@/pages/owner/api/types'

/*
 * 사장님 홈 · 알림 · 확인 필요 질문 훅 — 담당: 나현
 * 확인 필요 질문 · 답변은 .env VITE_REAL_API 에 'assistantChat'(사장님께 물어보기, + 'stores')을 넣으면 진짜 API.
 * 근무 중 · 재고 알림은 아직 가짜 서버만 (BE 미구현). 진짜 모드 알림에는 질문만 보인다.
 */

/** 답하면서 매뉴얼에도 추가할 수 있는지 (BE 는 아직 501 ADD_TO_MANUAL_NOT_SUPPORTED) */
export const canAddAnswerToManual = () => !isRealApi('assistantChat')

const fetchQuestions = (storeId: string): Promise<{ questions: OwnerQuestionItem[] }> =>
  isRealApi('assistantChat')
    ? http.get(`/stores/${storeId}/owner-questions?status=asked`)
    : getOwnerQuestions(storeId)

const postAnswer = (storeId: string, questionId: string, input: OwnerAnswer) =>
  isRealApi('assistantChat')
    ? http.post<OwnerQuestionItem>(`/stores/${storeId}/owner-questions/${questionId}/answer`, {
        ...input,
        addToManual: false,
      })
    : answerOwnerQuestion(storeId, questionId, input)

// 진짜 모드: 내 매장마다 답하지 않은 질문을 모아 알림으로 (재고 알림은 BE 가 없어서 빠진다)
const fetchNotifications = async (): Promise<{ notifications: OwnerNotification[] }> => {
  if (!isRealApi('assistantChat')) return getNotifications()
  const { stores } = await fetchStores()
  const lists = await Promise.all(stores.map((store) => fetchQuestions(store.storeId)))
  return {
    notifications: stores.flatMap((store, i) =>
      lists[i].questions.map<OwnerNotification>((q) => ({
        notificationId: `ntf_${q.questionId}`,
        storeId: store.storeId,
        storeName: store.name,
        kind: 'question',
        title: q.title,
        sub: `${q.staffName} · ${formatTime(q.askedAt)}`,
        questionId: q.questionId,
      })),
    ),
  }
}

export function useOnDuty(storeId: string) {
  return useQuery({
    queryKey: ownerKeys.onDuty(storeId),
    queryFn: () => getOnDuty(storeId),
    enabled: !!storeId,
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
