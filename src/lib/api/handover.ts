import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  confirmHandoverItem,
  createHandoverDraft,
  createHandoverNote,
  getHandoverDaySummary,
  getHandoverNotes,
} from '@/api/mocks/staff/api/handover'
import { notificationKeys } from '@/lib/api/notifications'
import { http, isRealApi } from '@/lib/api/source'
import { shouldRetry, toastApiError } from '@/lib/api/errors'
import { ApiError } from '@/lib/apiClient'
import type {
  HandoverConfirmation,
  HandoverDaySummary,
  HandoverDraft,
  HandoverNote,
  HandoverNoteList,
  NewHandoverNote,
} from '@/lib/api/types'

/*
 * 인수인계 훅 — 담당: 민지 (사장 화면도 import 해서 쓴다)
 * .env VITE_REAL_API 에 'handover'를 넣으면 진짜 API(apiFetch), 아니면 가짜 서버(api/mocks/staff/api) — lib/api/source. 경로 · 응답: docs/07 6
 */

export const handoverKeys = {
  all: (storeId: string) => ['stores', storeId, 'handover-notes'] as const,
  notes: (storeId: string, date: string) => ['stores', storeId, 'handover-notes', date] as const,
  /** 하루 AI 요약 — all 아래라 인수인계를 저장하면 같이 새로 불러온다 (체크 · 해제로는 안 부른다) */
  daySummary: (storeId: string, date: string) =>
    ['stores', storeId, 'handover-notes', 'day-summary', date] as const,
}

/** 인수인계 줄글 최대 글자 수 (BE 검증: 정리하기 text · 남기기 rawText 2000자) */
export const HANDOVER_TEXT_MAX = 2000
/** 항목 하나 최대 글자 수 · 요약 최대 글자 수 · 항목 최대 개수 (BE 검증) */
export const HANDOVER_ITEM_MAX = 500
export const HANDOVER_SUMMARY_MAX = 1000
export const HANDOVER_ITEMS_MAX = 50

/**
 * 노트 요약을 한 줄씩 모은 하루 요약 — 가짜 서버의 하루 요약이자, BE 하루 요약(useHandoverDaySummary)을
 * 불러오는 중 · 실패(503 AI_UNAVAILABLE 등) · null 일 때 알바 홈 카드가 대신 보여 주는 문구
 */
export function dayHandoverSummary(notes: HandoverNote[]): string {
  return notes
    .map((note) => note.summary.trim())
    .filter(Boolean)
    .join('\n')
}

const real = () => isRealApi('handover')
const notesPath = (storeId: string) => `/stores/${storeId}/handover-notes`

const fetchNotes = (storeId: string, date: string) =>
  real()
    ? http.get<HandoverNoteList>(`${notesPath(storeId)}?date=${encodeURIComponent(date)}`)
    : getHandoverNotes(storeId, date)
const postDraft = (storeId: string, text: string) =>
  real()
    ? http.post<HandoverDraft>(`/stores/${storeId}/handover-drafts`, { text })
    : createHandoverDraft(storeId, text)
const postNote = (storeId: string, body: NewHandoverNote) =>
  real() ? http.post<HandoverNote>(notesPath(storeId), body) : createHandoverNote(storeId, body)
const fetchDaySummary = (storeId: string, date: string) =>
  real()
    ? http.get<HandoverDaySummary>(
        `/stores/${storeId}/handover-summary?date=${encodeURIComponent(date)}`,
      )
    : getHandoverDaySummary(storeId, date)
// 항목별 체크는 docs/07 6-7 제안 모양. BE 가 다르게 정하면 이 함수 안쪽만 바꾼다
const postConfirmation = (storeId: string, noteId: string, body: HandoverConfirmation) =>
  real()
    ? http.post<HandoverNote>(`${notesPath(storeId)}/${noteId}/confirmations`, body)
    : confirmHandoverItem(storeId, noteId, body)

/** 그날 인수인계 노트 (최신 순) */
export function useHandoverNotes(storeId: string, date: string) {
  return useQuery({
    queryKey: handoverKeys.notes(storeId, date),
    queryFn: () => fetchNotes(storeId, date),
  })
}

/** AI 가 못 쓰는 상태(503 AI_UNAVAILABLE)는 다시 해도 같아서 바로 대체 문구로 */
const isAiUnavailable = (error: unknown) =>
  error instanceof ApiError && error.code === 'AI_UNAVAILABLE'

/**
 * 그날 인수인계 전체 AI 요약 (BE #41). 실패해도 에러 토스트 없이(meta.silent) 화면이 dayHandoverSummary 로 대신한다.
 * 같은 내용이면 BE 가 캐시로 돌려줘서 자주 불러도 AI 호출은 늘지 않는다
 */
export function useHandoverDaySummary(storeId: string, date: string) {
  return useQuery({
    queryKey: handoverKeys.daySummary(storeId, date),
    queryFn: () => fetchDaySummary(storeId, date),
    enabled: !!storeId,
    meta: { silent: true },
    retry: (failureCount, error) => !isAiUnavailable(error) && shouldRetry(failureCount, error),
  })
}

/** [AI로 정리하기]: 저장하지 않고 태그별 정리 결과만 받는다 */
export function useHandoverDraft(storeId: string) {
  return useMutation({ mutationFn: (text: string) => postDraft(storeId, text) })
}

/** 인수인계 저장 → 그 매장 목록을 다시 불러와 홈에 바로 보인다 */
export function useCreateHandoverNote(storeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: NewHandoverNote) => postNote(storeId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: handoverKeys.all(storeId) }),
  })
}

/** 항목 체크 · 해제: 누르면 바로 바뀌고, 실패하면 되돌린 뒤 토스트 */
export function useConfirmHandoverItem(storeId: string, date: string) {
  const queryClient = useQueryClient()
  const key = handoverKeys.notes(storeId, date)

  const confirm = useMutation({
    mutationFn: ({ noteId, ...body }: HandoverConfirmation & { noteId: string }) =>
      postConfirmation(storeId, noteId, body),
    onMutate: async ({ noteId, itemId, checked }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<HandoverNoteList>(key)
      queryClient.setQueryData<HandoverNoteList>(key, (old) =>
        old
          ? {
              ...old,
              notes: old.notes.map((note) =>
                note.noteId === noteId
                  ? {
                      ...note,
                      items: note.items.map((item) =>
                        item.itemId === itemId ? { ...item, checked } : item,
                      ),
                    }
                  : note,
              ),
            }
          : old,
      )
      return { previous }
    },
    // 출근 전 배너(체크 안 된 항목 수)도 바뀌니 알림을 다시 부른다
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.feed(storeId) }),
    onSuccess: (updated) =>
      queryClient.setQueryData<HandoverNoteList>(key, (old) =>
        old
          ? {
              ...old,
              notes: old.notes.map((note) => (note.noteId === updated.noteId ? updated : note)),
            }
          : old,
      ),
    onError: (error, variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', () => confirm.mutate(variables))
    },
  })
  return confirm
}
