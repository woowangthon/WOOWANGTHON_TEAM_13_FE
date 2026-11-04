import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  answerOwnerQuestion,
  dismissNotification,
  getNotifications,
  getOnDuty,
  getOwnerQuestions,
} from '@/api/mocks/owner/api'
import { manualKeys } from '@/lib/api/manuals'
import { ownerKeys } from '@/pages/owner/api/stores'
import type { OwnerAnswer } from '@/pages/owner/api/types'

// 사장님 홈 · 알림 · 확인 필요 질문 훅 (임시, 담당: 나현) — 가짜 서버(api/mocks/owner)

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
    queryFn: () => getOwnerQuestions(storeId),
    enabled: !!storeId,
  })
}

/** 모든 내 매장의 알림 (상단 종) */
export function useNotifications() {
  return useQuery({ queryKey: ownerKeys.notifications, queryFn: getNotifications })
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
      answerOwnerQuestion(questionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ownerKeys.questions(storeId) })
      queryClient.invalidateQueries({ queryKey: ownerKeys.notifications })
      queryClient.invalidateQueries({ queryKey: manualKeys.list(storeId) })
    },
  })
}
