import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  askOwner,
  createChat,
  getMessages,
  listChats,
  sendMessage,
} from '@/api/mocks/staff/api/assistantChat'
import { http, isRealApi } from '@/lib/api/source'
import { errorMessage, toastApiError } from '@/lib/api/errors'
import type {
  AssistantChatList,
  ChatMessage,
  ChatMessageList,
  CreatedAssistantChat,
  OwnerQuestion,
  SentChatMessage,
} from '@/lib/api/types'
import { ApiError } from '@/lib/apiClient'
import { toast } from '@/ui/toastStore'

/*
 * AI 사수 채팅 훅 — 담당: 민지
 * .env VITE_REAL_API 에 'assistantChat'를 넣으면 진짜 API(apiFetch), 아니면 가짜 서버(api/mocks/staff/api) — lib/api/source. 경로 · 응답: docs/07 5
 */

/** 질문 최대 글자 수 (BE 검증: text 1~1000자) */
export const CHAT_TEXT_MAX = 1000

export const chatKeys = {
  list: (storeId: string) => ['stores', storeId, 'assistant-chats'] as const,
  messages: (storeId: string, chatId: string) =>
    ['stores', storeId, 'assistant-chats', chatId, 'messages'] as const,
}

const real = () => isRealApi('assistantChat')
const chatsPath = (storeId: string) => `/stores/${storeId}/assistant-chats`
const messagesPath = (storeId: string, chatId: string) => `${chatsPath(storeId)}/${chatId}/messages`

const fetchChats = (storeId: string) =>
  real() ? http.get<AssistantChatList>(chatsPath(storeId)) : listChats(storeId)
const postChat = (storeId: string) =>
  real() ? http.post<CreatedAssistantChat>(chatsPath(storeId)) : createChat(storeId)
/**
 * 메시지 한 번에 불러오는 개수 (BE 기본 50, 1~100).
 * 메시지가 적을 때 '이전 대화 더 보기'를 확인하려고, 개발 중(npm run dev)에만 localStorage 'chat-page-size'(예: 5)로 줄일 수 있다
 */
export function chatPageSize() {
  if (import.meta.env.DEV) {
    try {
      const size = Number(localStorage.getItem('chat-page-size'))
      if (Number.isInteger(size) && size >= 1 && size <= 100) return size
    } catch {
      // 저장소를 못 쓰면 기본값
    }
  }
  return 50
}

/** 최근 메시지 (before 없음) 또는 before 메시지보다 앞의 메시지 — 오래된 순 + hasMore (docs/07 5-2) */
const fetchMessages = (storeId: string, chatId: string, before?: string) => {
  const limit = chatPageSize()
  const query = new URLSearchParams({ limit: String(limit) })
  if (before) query.set('before', before)
  return real()
    ? http.get<ChatMessageList>(`${messagesPath(storeId, chatId)}?${query}`)
    : getMessages(chatId, { before, limit })
}

/**
 * 이전 대화 + 최근 메시지 합치기: 이전 대화는 항상 최근 메시지보다 앞이라 이어 붙이고, 겹치면 최근 것(상태가 새것)만 남긴다
 */
function mergeMessages(older: ChatMessage[], latest: ChatMessage[]) {
  if (older.length === 0) return latest
  const latestIds = new Set(latest.map((m) => m.messageId))
  const seen = new Set<string>()
  const before = older.filter((m) => {
    if (latestIds.has(m.messageId) || seen.has(m.messageId)) return false
    seen.add(m.messageId)
    return true
  })
  return [...before, ...latest]
}
const postMessage = (storeId: string, chatId: string, text: string) =>
  real()
    ? http.post<SentChatMessage>(messagesPath(storeId, chatId), { text })
    : sendMessage(chatId, text)
// 사장님께 물어보기는 BE 표에 없어 경로 제안 (docs/07 5-3)
const postOwnerQuestion = (storeId: string, chatId: string, messageId: string) =>
  real()
    ? http.post<OwnerQuestion>(`${messagesPath(storeId, chatId)}/${messageId}/owner-questions`)
    : askOwner(chatId, messageId)

/**
 * 사장님 답변을 기다리는 중인 메시지가 있을 때만 내역을 다시 불러온다 (답이 오면 멈춤, 다른 탭이면 쉼).
 * 진짜 API 는 사람이 답하는 거라 5초마다, 가짜 서버는 시연(2.6초 뒤 답)이라 1초마다
 */
const OWNER_POLL_MS = () => (real() ? 5000 : 1000)
const isWaitingOwner = (data?: ChatMessageList) =>
  !!data?.messages.some((m) => m.ownerQuestion?.status === 'asked')

/**
 * 매장의 AI 사수 채팅방 + 메시지. 방이 없으면 자동으로 하나 만든다 (매장마다 방 1개).
 * 메시지는 최근 50개(내역 query, 새 메시지 · 사장님 답변 기다리기로 다시 불러옴) + 위로 올려 불러온 이전 대화(older)를 합쳐서 보여 준다.
 * 이전 대화를 따로 두어서 최근 메시지를 다시 불러와도 지워지지 않는다.
 */
export function useAssistantChat(storeId: string) {
  const queryClient = useQueryClient()
  const listQuery = useQuery({
    queryKey: chatKeys.list(storeId),
    queryFn: () => fetchChats(storeId),
  })
  const chatId = listQuery.data?.chats[0]?.chatId

  const create = useMutation({
    mutationFn: () => postChat(storeId),
    onError: (error) =>
      toastApiError(error, '채팅방을 열지 못했어요. 다시 시도해 주세요', () => create.mutate()),
    onSuccess: (created) => {
      const { suggestions, messages, ...chat } = created
      queryClient.setQueryData<AssistantChatList>(chatKeys.list(storeId), {
        suggestions,
        chats: [chat],
      })
      queryClient.setQueryData<ChatMessageList>(chatKeys.messages(storeId, chat.chatId), {
        chatId: chat.chatId,
        hasMore: false,
        messages,
      })
    },
  })

  // 방 목록을 받았는데 비어 있으면 한 번만 만든다 (매장별)
  const creatingFor = useRef<string | null>(null)
  const { mutate: createRoom } = create
  const noRoom = listQuery.isSuccess && !chatId
  useEffect(() => {
    if (!noRoom || creatingFor.current === storeId) return
    creatingFor.current = storeId
    createRoom()
  }, [noRoom, storeId, createRoom])

  const messagesQuery = useQuery({
    queryKey: chatKeys.messages(storeId, chatId ?? ''),
    queryFn: () => fetchMessages(storeId, chatId!),
    enabled: !!chatId,
    refetchInterval: (query) => (isWaitingOwner(query.state.data) ? OWNER_POLL_MS() : false),
  })

  // 이전 대화 — 방이 바뀌면 버린다.
  // 위로 올려 불러온 것 + 최근 메시지를 다시 불러올 때 최근 묶음 밖으로 밀려난 것(새 메시지 · 사장님 답변이 끝에 붙으면 앞쪽이 밀려남)을 모아 둔다
  const latest = messagesQuery.data
  const [older, setOlder] = useState<{
    chatId: string | undefined
    messages: ChatMessage[]
    /** 위로 불러온 마지막 결과의 hasMore (아직 안 불렀으면 null → 최근 메시지의 hasMore) */
    hasMore: boolean | null
    /** 이 상태를 만들 때 본 최근 메시지 묶음 (바뀌면 밀려난 것을 옮긴다) */
    seenLatest: ChatMessageList | undefined
  }>({ chatId, messages: [], hasMore: null, seenLatest: latest })
  if (older.chatId !== chatId) {
    setOlder({ chatId, messages: [], hasMore: null, seenLatest: latest })
  } else if (older.seenLatest !== latest) {
    const nowIds = new Set(latest?.messages.map((m) => m.messageId))
    const pushedOut = (older.seenLatest?.messages ?? []).filter(
      (m) => !nowIds.has(m.messageId) && !m.messageId.startsWith('temp_'),
    )
    // 최근 묶음이 앞으로 밀렸을 때만 (밀려난 것이 새 묶음의 첫 메시지보다 앞이면)
    const firstAt = latest?.messages[0]?.createdAt
    const kept = firstAt ? pushedOut.filter((m) => m.createdAt <= firstAt) : []
    setOlder({ ...older, messages: [...older.messages, ...kept], seenLatest: latest })
  }
  const olderOfChat = older.chatId === chatId ? older : null
  const messages = useMemo(
    () => (latest ? mergeMessages(olderOfChat?.messages ?? [], latest.messages) : undefined),
    [latest, olderOfChat],
  )
  const hasOlder = olderOfChat?.hasMore ?? !!latest?.hasMore
  const [loadingOlder, setLoadingOlder] = useState(false)
  const loadingOlderRef = useRef(false)

  /** 이전 대화 더 불러오기: 지금 보이는 가장 오래된 메시지 앞의 50개 (더 없으면 안 부름) */
  const loadOlder = useCallback(async () => {
    const cursor = messages?.find((m) => !m.messageId.startsWith('temp_'))?.messageId
    if (!chatId || !cursor || !hasOlder || loadingOlderRef.current) return
    loadingOlderRef.current = true
    setLoadingOlder(true)
    try {
      const page = await fetchMessages(storeId, chatId, cursor)
      setOlder((prev) =>
        prev.chatId === chatId
          ? { ...prev, messages: [...page.messages, ...prev.messages], hasMore: page.hasMore }
          : prev,
      )
    } catch (error) {
      toastApiError(error, '이전 대화를 불러오지 못했어요. 다시 시도해 주세요')
    } finally {
      loadingOlderRef.current = false
      setLoadingOlder(false)
    }
  }, [chatId, hasOlder, messages, storeId])

  const isError = listQuery.isError || create.isError || messagesQuery.isError
  return {
    error: listQuery.error ?? create.error ?? messagesQuery.error,
    /** 실패한 단계만 다시 (방 목록 → 방 만들기 → 메시지) */
    retry: () => {
      if (listQuery.isError) return void listQuery.refetch()
      if (create.isError) return create.mutate()
      return void messagesQuery.refetch()
    },
    chatId,
    suggestions: listQuery.data?.suggestions ?? [],
    messages,
    /** 이전 대화가 더 있는지 · 불러오는 중 · 더 불러오기 */
    hasOlder,
    loadingOlder,
    loadOlder,
    isPending: !messagesQuery.data && !isError,
    isError,
  }
}

/**
 * 질문 보내기: 내 질문은 바로 보이고, 답이 오면 이어 붙인다.
 * 실패하면(AI 503 · 연결 끊김 등) BE 는 질문도 저장하지 않아서 임시 질문을 빼고, 안내 · 다시 시도는 화면이 보여 준다 (ChatPage FailedAnswer)
 */
export function useSendMessage(storeId: string, chatId: string | undefined) {
  const queryClient = useQueryClient()
  const key = chatKeys.messages(storeId, chatId ?? '')
  const patch = (fn: (list: ChatMessage[]) => ChatMessage[]) =>
    queryClient.setQueryData<ChatMessageList>(key, (old) =>
      old ? { ...old, messages: fn(old.messages) } : old,
    )

  const send = useMutation({
    mutationFn: (text: string) => postMessage(storeId, chatId!, text),
    onMutate: (text) => {
      const tempId = `temp_${Date.now()}`
      patch((list) => [
        ...list,
        {
          messageId: tempId,
          sender: 'staff',
          text,
          answerType: null,
          sources: [],
          canAskOwner: false,
          ownerQuestion: null,
          createdAt: new Date().toISOString(),
        },
      ])
      return { tempId }
    },
    onSuccess: ({ question, answer }, _text, context) => {
      // 답을 기다리는 동안 내역을 다시 불러왔으면(사장님 답변 대기) 같은 메시지가 이미 있을 수 있어 걸러 낸다
      const drop = new Set([context.tempId, question.messageId, answer.messageId])
      patch((list) => [...list.filter((m) => !drop.has(m.messageId)), question, answer])
    },
    onError: (_error, _text, context) => {
      patch((list) => list.filter((m) => m.messageId !== context?.tempId))
    },
  })
  return send
}

/** 사장님께 물어보기 (근거 없는 답변의 버튼) */
export function useAskOwner(storeId: string, chatId: string | undefined) {
  const queryClient = useQueryClient()
  const key = chatKeys.messages(storeId, chatId ?? '')

  const ask = useMutation({
    mutationFn: (messageId: string) => postOwnerQuestion(storeId, chatId!, messageId),
    onSuccess: (result, messageId) => {
      queryClient.setQueryData<ChatMessageList>(key, (old) =>
        old
          ? {
              ...old,
              messages: [
                ...old.messages
                  .filter((m) => m.messageId !== result.systemMessage.messageId)
                  .map((m) =>
                    m.messageId === messageId
                      ? {
                          ...m,
                          canAskOwner: false,
                          ownerQuestion: {
                            ownerQuestionId: result.ownerQuestionId,
                            status: result.status,
                          },
                        }
                      : m,
                  ),
                result.systemMessage,
              ],
            }
          : old,
      )
    },
    onError: (error, messageId) => {
      // 이미 물어봤거나(409) 물어볼 수 없는 답변(422)이면 다시 해도 같다 → 최신 내역으로 맞추고 BE 문장만 알린다
      if (error instanceof ApiError && (error.status === 409 || error.status === 422)) {
        void queryClient.invalidateQueries({ queryKey: key })
        toast.error(errorMessage(error, '사장님께 전달하지 못했어요'))
        return
      }
      toastApiError(error, '사장님께 전달하지 못했어요. 다시 시도해 주세요', () =>
        ask.mutate(messageId),
      )
    },
  })
  return ask
}
