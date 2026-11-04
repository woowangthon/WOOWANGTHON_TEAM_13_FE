import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  confirmHandoverItem,
  createHandoverDraft,
  createHandoverNote,
  getHandoverNotes,
} from '@/api/mocks/staff/api/handover'
import { toastApiError } from '@/lib/api/errors'
import type { HandoverConfirmation, HandoverNoteList, NewHandoverNote } from '@/lib/api/types'

/*
 * 인수인계 훅 — 담당: 민지 (사장 화면도 import 해서 쓴다)
 * 지금은 가짜 서버(api/mocks/staff/api)를 부른다. BE 연결 시 fetch 함수 안쪽만
 * apiFetch(`/stores/${storeId}/handover-…`) 또는 orval 생성 함수로 바꾸면 된다. 응답 모양: docs/07 6
 */

export const handoverKeys = {
  all: (storeId: string) => ['stores', storeId, 'handover-notes'] as const,
  notes: (storeId: string, date: string) => ['stores', storeId, 'handover-notes', date] as const,
}

const fetchNotes = (storeId: string, date: string) => getHandoverNotes(storeId, date)
const postDraft = (storeId: string, text: string) => createHandoverDraft(storeId, text)
const postNote = (storeId: string, body: NewHandoverNote) => createHandoverNote(storeId, body)
// 항목별 체크는 docs/07 6-7 제안 모양. BE 가 다르게 정하면 이 함수 안쪽만 바꾼다
const postConfirmation = (storeId: string, noteId: string, body: HandoverConfirmation) =>
  confirmHandoverItem(storeId, noteId, body)

/** 그날 인수인계 노트 (최신 순) */
export function useHandoverNotes(storeId: string, date: string) {
  return useQuery({
    queryKey: handoverKeys.notes(storeId, date),
    queryFn: () => fetchNotes(storeId, date),
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
