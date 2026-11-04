/*
 * API 응답 타입 — 담당: 민지
 * 모양은 docs/07_API_응답_제안.md 기준. BE 가 확정하거나 orval 로 타입이 생기면 여기를 맞춘다.
 * 화면 · shared 부품은 가짜 데이터(api/mocks) 타입 대신 이 타입을 쓴다.
 */

// ── 레시피 (docs/07 3) ──

export type RecipeTemp = 'ICE' | 'HOT' | 'DESSERT'

export interface Ingredient {
  name: string
  amount: string
}

/** 레시피 목록 항목 (3-1) */
export interface RecipeSummary {
  recipeId: string
  name: string
  /** 사장님이 정한 카테고리 이름 (커피 · 라떼 …) */
  category: string
  temp: RecipeTemp
  size: string
  ingredients: Ingredient[]
  isNew: boolean
  updatedAt: string
}

/** 레시피 상세 (3-2) */
export interface Recipe extends RecipeSummary {
  steps: string[]
  memo: string | null
}

export interface RecipeCategoryCount {
  name: string
  count: number
}

/** GET /stores/{storeId}/recipes */
export interface RecipeList {
  categories: RecipeCategoryCount[]
  defaultCategory: string | null
  recipes: RecipeSummary[]
}

// ── 매뉴얼 (docs/07 4) ──

/** 템플릿 아이콘 키. 직접 추가한 매뉴얼은 null */
export type ManualIcon =
  'wifi' | 'restroom' | 'open' | 'close' | 'delivery' | 'refund' | 'milk' | 'umbrella'

export interface Manual {
  manualId: string
  icon: ManualIcon | null
  title: string
  body: string
  isNew: boolean
  updatedAt: string
}

/** GET /stores/{storeId}/manuals */
export interface ManualList {
  manuals: Manual[]
}

// ── AI 사수 채팅 (docs/07 5) ──

export type ChatSender = 'staff' | 'ai' | 'owner' | 'system'

/** AI 답변 종류: 근거 있음 · 근거 없음(사장님께 물어보기) · 매장 업무와 무관 */
export type AnswerType = 'answered' | 'not_found' | 'out_of_scope'

/** 출처 카드 (docs/07 0-2). 화면 문구 "레시피 › 딸기라떼"는 FE 가 만든다 */
export interface Source {
  kind: 'recipe' | 'manual'
  id: string
  title: string
}

export interface OwnerQuestionRef {
  ownerQuestionId: string
  /** asked 사장님께 전달됨 · answered 사장님이 답함 */
  status: 'asked' | 'answered'
}

export interface ChatMessage {
  messageId: string
  sender: ChatSender
  text: string
  /** AI 답변만. 다른 sender 는 null */
  answerType: AnswerType | null
  sources: Source[]
  canAskOwner: boolean
  ownerQuestion: OwnerQuestionRef | null
  createdAt: string
}

export interface AssistantChat {
  chatId: string
  storeId: string
  createdAt: string
  lastMessageAt: string
  lastMessageText: string
}

/** GET /stores/{storeId}/assistant-chats */
export interface AssistantChatList {
  /** 입력창 위 자주 묻는 질문 칩 */
  suggestions: string[]
  chats: AssistantChat[]
}

/** POST /stores/{storeId}/assistant-chats */
export interface CreatedAssistantChat extends AssistantChat {
  suggestions: string[]
  messages: ChatMessage[]
}

/** GET /stores/{storeId}/assistant-chats/{chatId}/messages */
export interface ChatMessageList {
  chatId: string
  hasMore: boolean
  messages: ChatMessage[]
}

/** POST …/messages: 저장된 질문 + AI 답변 */
export interface SentChatMessage {
  question: ChatMessage
  answer: ChatMessage
}

/** 사장님께 물어보기 (docs/07 5-3, BE 표에 없어 경로 제안) */
export interface OwnerQuestion {
  ownerQuestionId: string
  status: 'asked' | 'answered'
  question: string
  createdAt: string
  systemMessage: ChatMessage
}
