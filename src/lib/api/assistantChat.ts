import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import {
  askOwner,
  createChat,
  getMessages,
  listChats,
  sendMessage,
} from '@/api/mocks/staff/api/assistantChat'
import type { AssistantChatList, ChatMessage, ChatMessageList } from '@/lib/api/types'
import { toast } from '@/ui/toastStore'

/*
 * AI 사수 채팅 훅 — 담당: 민지
 * 지금은 가짜 서버(api/mocks/staff/api)를 부른다. BE 연결 시 fetch 함수 안쪽만
 * apiFetch(`/stores/${storeId}/assistant-chats…`) 또는 orval 생성 함수로 바꾸면 된다. 응답 모양: docs/07 5
 */

export const chatKeys = {
  list: (storeId: string) => ['stores', storeId, 'assistant-chats'] as const,
  messages: (storeId: string, chatId: string) =>
    ['stores', storeId, 'assistant-chats', chatId, 'messages'] as const,
}

const fetchChats = (storeId: string) => listChats(storeId)
const postChat = (storeId: string) => createChat(storeId)
const fetchMessages = (chatId: string) => getMessages(chatId)
const postMessage = (chatId: string, text: string) => sendMessage(chatId, text)
const postOwnerQuestion = (chatId: string, messageId: string) => askOwner(chatId, messageId)

/** 사장님 답변을 기다리는 중인 메시지가 있으면 1초마다 내역을 다시 불러온다 (답이 오면 멈춤) */
const OWNER_POLL_MS = 1000
const isWaitingOwner = (data?: ChatMessageList) =>
  !!data?.messages.some((m) => m.ownerQuestion?.status === 'asked')

/**
 * 매장의 AI 사수 채팅방 + 메시지. 방이 없으면 자동으로 하나 만든다 (매장마다 방 1개).
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
    queryFn: () => fetchMessages(chatId!),
    enabled: !!chatId,
    refetchInterval: (query) => (isWaitingOwner(query.state.data) ? OWNER_POLL_MS : false),
  })

  const isError = listQuery.isError || create.isError || messagesQuery.isError
  // 실패한 단계만 다시 (refetch · mutate 는 렌더마다 같은 함수라 retry 도 실패 상태가 바뀔 때만 바뀐다)
  const { refetch: refetchList } = listQuery
  const { refetch: refetchMessages } = messagesQuery
  const listFailed = listQuery.isError
  const createFailed = create.isError
  const retry = useCallback(() => {
    if (listFailed) return refetchList()
    if (createFailed) return createRoom()
    return refetchMessages()
  }, [listFailed, createFailed, refetchList, createRoom, refetchMessages])

  return {
    chatId,
    suggestions: listQuery.data?.suggestions ?? [],
    messages: messagesQuery.data?.messages,
    isPending: !messagesQuery.data && !isError,
    isError,
    retry,
  }
}

/** 질문 보내기: 내 질문은 바로 보이고, 답이 오면 이어 붙인다 */
export function useSendMessage(storeId: string, chatId: string | undefined) {
  const queryClient = useQueryClient()
  const key = chatKeys.messages(storeId, chatId ?? '')
  const patch = (fn: (list: ChatMessage[]) => ChatMessage[]) =>
    queryClient.setQueryData<ChatMessageList>(key, (old) =>
      old ? { ...old, messages: fn(old.messages) } : old,
    )

  const send = useMutation({
    mutationFn: (text: string) => postMessage(chatId!, text),
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
    onError: (_error, text, context) => {
      patch((list) => list.filter((m) => m.messageId !== context?.tempId))
      toast.error('답변을 받지 못했어요. 다시 시도해 주세요', {
        onRetry: () => send.mutate(text),
      })
    },
  })
  return send
}

/** 사장님께 물어보기 (근거 없는 답변의 버튼) */
export function useAskOwner(storeId: string, chatId: string | undefined) {
  const queryClient = useQueryClient()
  const key = chatKeys.messages(storeId, chatId ?? '')

  const ask = useMutation({
    mutationFn: (messageId: string) => postOwnerQuestion(chatId!, messageId),
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
    onError: (_error, messageId) =>
      toast.error('사장님께 전달하지 못했어요. 다시 시도해 주세요', {
        onRetry: () => ask.mutate(messageId),
      }),
  })
  return ask
}
