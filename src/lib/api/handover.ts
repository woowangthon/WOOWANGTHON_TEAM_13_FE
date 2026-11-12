import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
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
  HandoverItem,
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

type ItemState = Pick<HandoverItem, 'checked' | 'checkedBy' | 'checkedAt'>

/** 노트 목록 캐시에서 항목 하나만 바꾼다 (같은 노트의 다른 항목은 그대로) */
function patchItem(
  list: HandoverNoteList | undefined,
  noteId: string,
  itemId: string,
  patch: ItemState,
): HandoverNoteList | undefined {
  if (!list) return list
  return {
    ...list,
    notes: list.notes.map((note) =>
      note.noteId === noteId
        ? {
            ...note,
            items: note.items.map((item) =>
              item.itemId === itemId ? { ...item, ...patch } : item,
            ),
          }
        : note,
    ),
  }
}

const findItem = (list: HandoverNoteList | undefined, noteId: string, itemId: string) =>
  list?.notes.find((n) => n.noteId === noteId)?.items.find((i) => i.itemId === itemId)

const stateOf = (item: HandoverItem): ItemState => ({
  checked: item.checked,
  checkedBy: item.checkedBy,
  checkedAt: item.checkedAt,
})

/**
 * 항목 체크 · 해제: 누르면 바로 바뀌고(낙관적), 실패하면 그 항목만 되돌린 뒤 토스트.
 * - 서버 응답은 노트 전체지만 "이번에 누른 항목" 하나만 반영한다: 같은 노트의 다른 항목을 연달아 누르면
 *   먼저 끝난 응답에는 아직 처리 안 된 다른 항목이 들어 있어서, 노트를 통째로 덮으면 그 항목이 풀렸다 다시 체크된다(깜빡임)
 * - 같은 항목을 빠르게 여러 번 누르면 요청마다 순번을 붙여 마지막 요청의 결과만 화면에 반영한다 (이전 응답 · 실패는 무시)
 * - 실패하면 그 항목을 "서버가 마지막으로 확인해 준 상태"로 되돌린다 (다른 항목 체크는 그대로)
 */
export function useConfirmHandoverItem(storeId: string, date: string) {
  const queryClient = useQueryClient()
  const key = handoverKeys.notes(storeId, date)
  // 항목별: 마지막으로 보낸 요청 순번 · 서버가 마지막으로 확인해 준 상태(진행 중인 요청이 있을 때만)
  const latest = useRef(new Map<string, number>())
  const confirmed = useRef(new Map<string, ItemState>())
  const inFlight = useRef(new Map<string, number>())

  const settle = (itemId: string) => {
    const left = (inFlight.current.get(itemId) ?? 1) - 1
    if (left > 0) inFlight.current.set(itemId, left)
    else {
      inFlight.current.delete(itemId)
      confirmed.current.delete(itemId)
    }
  }

  const confirm = useMutation({
    mutationFn: ({ noteId, ...body }: HandoverConfirmation & { noteId: string }) =>
      postConfirmation(storeId, noteId, body),
    onMutate: async ({ noteId, itemId, checked }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const current = findItem(queryClient.getQueryData<HandoverNoteList>(key), noteId, itemId)
      // 이 항목의 첫 요청이면 지금 상태가 "서버가 확인한 상태"
      if (!inFlight.current.has(itemId) && current) confirmed.current.set(itemId, stateOf(current))
      inFlight.current.set(itemId, (inFlight.current.get(itemId) ?? 0) + 1)
      const seq = (latest.current.get(itemId) ?? 0) + 1
      latest.current.set(itemId, seq)
      queryClient.setQueryData<HandoverNoteList>(key, (old) =>
        patchItem(old, noteId, itemId, {
          checked,
          checkedBy: current?.checkedBy ?? null,
          checkedAt: current?.checkedAt ?? null,
        }),
      )
      return { seq }
    },
    onSuccess: (updated, { noteId, itemId }, context) => {
      const item = updated.items.find((i) => i.itemId === itemId)
      if (!item) return
      confirmed.current.set(itemId, stateOf(item))
      // 더 나중에 누른 같은 항목 요청이 있으면 화면은 그 요청에 맡긴다
      if (context.seq !== latest.current.get(itemId)) return
      queryClient.setQueryData<HandoverNoteList>(key, (old) =>
        patchItem(old, noteId, itemId, stateOf(item)),
      )
    },
    onError: (error, variables, context) => {
      // 더 나중 요청이 있으면 그 결과를 기다린다 (토스트도 마지막 요청 기준)
      if (!context || context.seq !== latest.current.get(variables.itemId)) return
      const base = confirmed.current.get(variables.itemId)
      if (base) {
        queryClient.setQueryData<HandoverNoteList>(key, (old) =>
          patchItem(old, variables.noteId, variables.itemId, base),
        )
      }
      toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', () => confirm.mutate(variables))
    },
    // 출근 전 배너(체크 안 된 항목 수)도 바뀌니 알림을 다시 부른다
    onSettled: (_data, _error, { itemId }) => {
      settle(itemId)
      return queryClient.invalidateQueries({ queryKey: notificationKeys.feed(storeId) })
    },
  })
  return confirm
}
