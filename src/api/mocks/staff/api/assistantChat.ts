import { addUmbrellaManual, isUmbrellaAdded } from '@/api/mocks/staff/api/db'
import {
  initialChats,
  mockAnswer,
  OWNER_ANSWER,
  type ChatMessage as MockChatMessage,
} from '@/api/mocks/staff/chat'
import { findStaffStore } from '@/api/mocks/staff/stores'
import { ApiError } from '@/lib/apiClient'
import type {
  AssistantChat,
  AssistantChatList,
  ChatMessage,
  ChatMessageList,
  CreatedAssistantChat,
  OwnerQuestion,
  SentChatMessage,
} from '@/lib/api/types'

/*
 * 가짜 서버: AI 사수 채팅 API (docs/07 5) — BE 연결 전까지 사용.
 * 답변은 지금처럼 가짜 AI(chat.ts mockAnswer)가 매장 매뉴얼 · 레시피에서 찾는다. 대화는 메모리에 둔다.
 */

const ANSWER_DELAY = 800 // 답변을 기다리는 시간 (입력 중 ··· 이 보이게)
const OWNER_REPLY_DELAY = 2600 // 시연: 사장님이 답하기까지

const chats = new Map<string, AssistantChat>() // chatId → 방
const messages = new Map<string, ChatMessage[]>() // chatId → 메시지
let seq = 0

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const now = () => new Date().toISOString()
const nextId = (prefix: string) => `${prefix}_${++seq}`

function message(sender: ChatMessage['sender'], text: string, extra: Partial<ChatMessage> = {}) {
  return {
    messageId: nextId('msg'),
    sender,
    text,
    answerType: null,
    sources: [],
    canAskOwner: false,
    ownerQuestion: null,
    createdAt: now(),
    ...extra,
  } satisfies ChatMessage
}

/** 가짜 AI 답변(옛 모양)을 API 메시지로: 출처 있음 → answered · 물어보기 → not_found · 나머지 → out_of_scope */
function fromMock(m: MockChatMessage, isGreeting = false): ChatMessage {
  if (m.who === 'me') return message('staff', m.text)
  if (m.who === 'owner') return message('owner', m.text)
  if (m.who === 'system' || m.who === 'typing') return message('system', 'text' in m ? m.text : '')
  if (m.source) {
    const { kind, id, label } = m.source
    return message('ai', m.text, {
      answerType: 'answered',
      sources: [{ kind, id, title: label.split(' › ').pop() ?? label }],
    })
  }
  if (m.askOwner) return message('ai', m.text, { answerType: 'not_found', canAskOwner: true })
  return message('ai', m.text, { answerType: isGreeting ? null : 'out_of_scope' })
}

function findChat(chatId: string) {
  const chat = chats.get(chatId)
  if (!chat)
    throw new ApiError(404, { code: 'NOT_FOUND', message: '채팅방을 찾지 못했어요', detail: null })
  return chat
}

function append(chatId: string, ...added: ChatMessage[]) {
  const list = [...(messages.get(chatId) ?? []), ...added]
  messages.set(chatId, list)
  const last = list[list.length - 1]
  if (!last) return // 지난 대화가 없는 새 매장 방
  chats.set(chatId, {
    ...findChat(chatId),
    lastMessageAt: last.createdAt,
    lastMessageText: last.text,
  })
}

function update(chatId: string, messageId: string, patch: Partial<ChatMessage>) {
  messages.set(
    chatId,
    (messages.get(chatId) ?? []).map((m) => (m.messageId === messageId ? { ...m, ...patch } : m)),
  )
}

/** GET /stores/{storeId}/assistant-chats */
export async function listChats(storeId: string): Promise<AssistantChatList> {
  return {
    suggestions: findStaffStore(storeId).chips,
    chats: [...chats.values()].filter((c) => c.storeId === storeId),
  }
}

/** POST /stores/{storeId}/assistant-chats — 시연용 지난 대화(chat.ts initialChats)를 넣어 만든다 */
export async function createChat(storeId: string): Promise<CreatedAssistantChat> {
  const chatId = `cht_${storeId}`
  const seeded = (initialChats[storeId] ?? []).map((m, i) => fromMock(m, i === 0))
  const created = now()
  chats.set(chatId, {
    chatId,
    storeId,
    createdAt: created,
    lastMessageAt: created,
    lastMessageText: null,
  })
  messages.set(chatId, [])
  append(chatId, ...seeded)
  return { ...findChat(chatId), suggestions: findStaffStore(storeId).chips, messages: seeded }
}

/** GET /stores/{storeId}/assistant-chats/{chatId}/messages?before=&limit= — before 메시지보다 앞의 limit 개 (오래된 순) + 더 있는지 */
export async function getMessages(
  chatId: string,
  { before, limit = 50 }: { before?: string; limit?: number } = {},
): Promise<ChatMessageList> {
  findChat(chatId)
  const list = messages.get(chatId) ?? []
  const end = before ? list.findIndex((m) => m.messageId === before) : list.length
  if (end < 0) {
    throw new ApiError(404, { code: 'NOT_FOUND', message: '메시지를 찾지 못했어요', detail: null })
  }
  const start = Math.max(0, end - limit)
  return { chatId, hasMore: start > 0, messages: list.slice(start, end) }
}

/** POST /stores/{storeId}/assistant-chats/{chatId}/messages */
export async function sendMessage(chatId: string, text: string): Promise<SentChatMessage> {
  const chat = findChat(chatId)
  const question = message('staff', text)
  append(chatId, question)
  await wait(ANSWER_DELAY)
  const answer = fromMock(mockAnswer(chat.storeId, text, isUmbrellaAdded()))
  append(chatId, answer)
  return { question, answer }
}

/** POST …/messages/{messageId}/owner-questions (docs/07 5-3) — 시연: 달빛 카페는 사장님이 잠시 뒤 답하고 매뉴얼에 추가된다 */
export async function askOwner(chatId: string, messageId: string): Promise<OwnerQuestion> {
  const chat = findChat(chatId)
  const list = messages.get(chatId) ?? []
  const index = list.findIndex((m) => m.messageId === messageId)
  const target = list[index]
  if (!target || target.answerType !== 'not_found') {
    throw new ApiError(422, {
      code: 'OWNER_QUESTION_NOT_ALLOWED',
      message: '찾지 못한 답변만 사장님께 물어볼 수 있어요',
      detail: null,
    })
  }
  if (target.ownerQuestion) {
    throw new ApiError(409, {
      code: 'OWNER_QUESTION_ALREADY_SENT',
      message: '이미 사장님께 물어봤어요',
      detail: null,
    })
  }

  const ownerQuestionId = nextId('oq')
  update(chatId, messageId, {
    canAskOwner: false,
    ownerQuestion: { ownerQuestionId, status: 'asked' },
  })
  const systemMessage = message('system', '사장님께 전달했어요')
  append(chatId, systemMessage)

  if (chat.storeId === 'dalbit') {
    setTimeout(() => {
      update(chatId, messageId, { ownerQuestion: { ownerQuestionId, status: 'answered' } })
      append(chatId, message('owner', OWNER_ANSWER), message('system', '매뉴얼에 추가했어요'))
      addUmbrellaManual()
    }, OWNER_REPLY_DELAY)
  }

  const question = [...list.slice(0, index)].reverse().find((m) => m.sender === 'staff')
  return {
    ownerQuestionId,
    status: 'asked',
    question: question?.text ?? '',
    createdAt: systemMessage.createdAt,
    systemMessage,
  }
}
