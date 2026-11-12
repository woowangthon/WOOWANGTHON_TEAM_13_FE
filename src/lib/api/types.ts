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
  /** 정하지 않았으면 null */
  temp: RecipeTemp | null
  /** 정하지 않았으면 null */
  size: string | null
  ingredients: Ingredient[]
  /** 메뉴 사진. BE 가 아직 안 줘서 FE 가 시연 사진(menuPhotoUrl)으로 채운다 — 없으면 null (아이콘) */
  imageUrl: string | null
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
  /** 아직 메시지가 없는 새 방이면 null */
  lastMessageText: string | null
}

/** GET /stores/{storeId}/assistant-chats */
export interface AssistantChatList {
  /** 입력창 위 자주 묻는 질문 칩 (BE: 매뉴얼 제목 최대 4개, 매뉴얼이 없으면 []) */
  suggestions: string[]
  /** 최근 대화 순 */
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
  /** 더 오래된 메시지가 있음 (BE: 최근 50개씩, ?before=<가장 오래된 messageId> 로 더 받기). FE는 아직 최근 50개만 보여 준다 */
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

// ── 인수인계 (docs/07 6) ──

/** credit 외상 · stock 재고 · etc 기타 (화면 글자는 shared/icons HANDOVER_TAG_LABEL) */
export type HandoverTag = 'credit' | 'stock' | 'etc'

export interface UserRef {
  userId: string
  name: string
}

export interface HandoverItem {
  itemId: string
  tag: HandoverTag
  text: string
  /** 처리 여부 (매장 공용) */
  checked: boolean
  checkedBy: UserRef | null
  checkedAt: string | null
}

export interface HandoverNote {
  noteId: string
  author: UserRef
  createdAt: string
  updatedAt: string
  rawText: string
  /** [특이사항 없음]으로 남긴 노트 (summary "", items []) */
  noIssue: boolean
  summary: string
  items: HandoverItem[]
}

/** GET /stores/{storeId}/handover-notes?date= */
export interface HandoverNoteList {
  date: string
  notes: HandoverNote[]
}

export interface HandoverDraftItem {
  tag: HandoverTag
  text: string
}

/** POST /stores/{storeId}/handover-drafts (저장하지 않은 AI 정리 결과) */
export interface HandoverDraft {
  summary: string
  items: HandoverDraftItem[]
}

/** POST /stores/{storeId}/handover-notes 요청 */
export interface NewHandoverNote extends HandoverDraft {
  rawText: string
  noIssue: boolean
}

/** POST …/handover-notes/{noteId}/confirmations 요청 (docs/07 6-7 제안: 항목별 체크) */
export interface HandoverConfirmation {
  itemId: string
  checked: boolean
}

// ── 내 매장 · 초대코드 (docs/07 1-3 · 2) ──

/** 매장 색 · 아이콘 묶음 키 (색 값은 FE: shared/storeTheme). 저장 안 하면 null */
export type StoreTheme = 'moon' | 'sunset'

/** GET /users/me/stores 항목 (11/9 BE #25로 들어옴: ownerName · staffName · memberId · photoUrl · address · joinedAt) */
export interface MyStoreDetail {
  storeId: string
  name: string
  /** 업종. BE 가 아직 안 주면 null */
  kind: string | null
  address: string
  ownerName: string
  role: 'owner' | 'staff'
  /** 이 매장에서의 내 구성원 ID (사장님 매장이면 null) */
  memberId: string | null
  /** 사장님이 알바생 추가 때 적은 이름 (사장님 매장이면 null) */
  staffName: string | null
  photoUrl: string | null
  theme: StoreTheme | null
  joinedAt: string
}

export interface MyStoreList {
  stores: MyStoreDetail[]
}

/** 초대코드 확인에서 보여 줄 매장 (매장 카드 · 입장 완료 화면) */
export interface InviteStore {
  storeId: string
  name: string
  ownerName: string
  photoUrl: string | null
  /** FE 추가 요청: 입장 완료 화면 색 */
  theme: StoreTheme | null
}

/** POST /invitations/verify */
export interface InviteVerification {
  code: string
  staffName: string
  store: InviteStore
}

/** POST /memberships/join */
export interface Membership {
  storeId: string
  storeName: string
  memberId: string
  role: 'staff'
  staffName: string
  joinedAt: string
}

/** INVITE_ALREADY_JOINED 에러의 detail ([○○로 가기] 버튼) */
export interface AlreadyJoinedDetail {
  storeId: string
  storeName: string
}

// ── 알림 (docs/07 10, BE feature_notifications) ──

/**
 * 알바: SUBSTITUTE_REQUESTED · SUBSTITUTE_ACCEPTED · SUBSTITUTE_REJECTED · DAILY_SCHEDULE_CHANGED · OWNER_ANSWERED
 * 사장님: HANDOVER_CREATED · OWNER_QUESTION_ASKED
 */
export type NotificationType =
  | 'SUBSTITUTE_REQUESTED'
  | 'SUBSTITUTE_ACCEPTED'
  | 'SUBSTITUTE_REJECTED'
  | 'DAILY_SCHEDULE_CHANGED'
  | 'OWNER_ANSWERED'
  | 'HANDOVER_CREATED'
  | 'OWNER_QUESTION_ASKED'

export interface AppNotification {
  notificationId: string
  /** 모르는 종류가 와도 깨지지 않게 string 도 받는다 */
  type: NotificationType | (string & {})
  title: string
  body: string
  createdAt: string
  isRead: boolean
  /** 누르면 갈 곳: substitute_request · daily_schedule · assistant_chat · handover · owner_question */
  target: { kind: string; id: string }
}

/** 출근 전 인수인계 배너 항목 (체크 안 된 것) */
export interface ShiftBannerItem {
  noteId: string
  itemId: string
  tag: HandoverTag
  text: string
  authorName: string
  workDate: string
}

/** 출근 30분 전 ~ 근무 끝까지 오는 배너 */
export interface ShiftBanner {
  workDate: string
  startTime: string
  endTime: string
  startsAt: string
  uncheckedCount: number
  items: ShiftBannerItem[]
}

/** GET /stores/{storeId}/notifications — 최근 14일, 내 역할에 맞는 것만 */
export interface NotificationFeed {
  banner: ShiftBanner | null
  notifications: AppNotification[]
  unreadCount: number
}

// ── 근무 (docs/07 7, P1) ──

/** 근무하는 사람 (알바생 · 사장님). 사장님은 memberId null, 퇴사한 사람도 memberId null · name "퇴사한 직원" */
export interface ScheduleWorker {
  userId: string
  memberId: string | null
  name: string
  role: 'owner' | 'staff'
}

/** 공유 근무 달력의 근무 한 칸 (그날 · 그 시간 · 그 사람) */
export interface CalendarShift {
  /** 고정 근무 배정 ID (요일마다 반복). 날짜와 함께 써야 한 칸이 정해진다. 하루 조정한 근무는 null (대타 요청 불가) */
  assignmentId: string | null
  templateId: string
  date: string
  /** 근무 이름 (오픈 · 마감 …) */
  name: string
  start: string
  end: string
  /** 역할 메모 (없으면 "") */
  role: string
  assignee: ScheduleWorker
  /** 대타로 바뀐 칸 */
  substituted: boolean
  /** 하루 조정한 근무의 ID (BE #38). 고정 근무는 null */
  dailyShiftId?: string | null
  /** 사장님이 그날만 조정한 근무 */
  manuallyAdjusted?: boolean
}

/** 대타 요청 상태: 대기 · 수락됨 · 거절됨 · 취소됨 */
export type SubstituteStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'

/** 대타 요청 (GET /stores/{storeId}/substitute-requests?box=received|sent) */
export interface SubstituteRequest {
  requestId: string
  status: SubstituteStatus
  /** 바꿀 근무 날짜 */
  date: string
  assignmentId: string
  shiftName: string
  start: string
  end: string
  /** 요청한 사람 (원래 근무자) */
  requester: ScheduleWorker
  /** 요청받은 사람 (대신 일할 사람) */
  target: ScheduleWorker
  /** 받은 사람이 읽었는지 (받은 목록을 불러오면 읽음 처리) */
  isRead: boolean
  createdAt: string
  respondedAt: string | null
}

/** POST /stores/{storeId}/substitute-requests 요청 */
export interface NewSubstituteRequest {
  assignmentId: string
  date: string
  targetUserId: string
}

/** GET /stores/{storeId}/schedule-calendar?startDate=&endDate= (최대 63일, 구성원 누구나) */
export interface ScheduleCalendar {
  startDate: string
  endDate: string
  shifts: CalendarShift[]
}

export interface Shift {
  shiftId: string
  date: string
  start: string
  end: string
  /** 근무 이름 (마감 · 오후 …) */
  role: string
  /** 함께 일하는 사람 (나 빼고) */
  crew: string[]
}

/** GET /stores/{storeId}/schedules/me */
export interface MySchedule {
  /** 서버 기준 오늘 */
  today: string
  /** 이번 주 월요일 */
  weekStart: string
  /** 이번 주 근무 시간 */
  weekHours: number
  /** 주휴수당 기준 시간 (15) */
  weeklyAllowanceHours: number
  /** 이번 주 한 줄 설명 (예: 오늘 마감 후 15시간 · 주휴수당 대상) */
  weekNote: string
  /** 확정된 내 근무 (날짜 순) */
  shifts: Shift[]
}

export type AvailabilityStatus = 'available' | 'unavailable'

export interface AvailabilityDay {
  date: string
  status: AvailabilityStatus
}

/** GET /stores/{storeId}/availabilities/me — 아직 안 냈으면 availabilityId · submittedAt 이 null */
export interface MyAvailability {
  /** 낸 근무 가능 시간 ID (수정 · 삭제할 때). 안 냈으면 null */
  availabilityId: string | null
  /** 가능 시간을 받는 달 "2026-12" */
  month: string
  deadline: string
  days: AvailabilityDay[]
  memo: string
  /** 제출 시각. 안 냈으면 null */
  submittedAt: string | null
}

/** PATCH /stores/{storeId}/availabilities/{availabilityId} 요청 */
export interface AvailabilityInput {
  days: AvailabilityDay[]
  memo: string
}

/** POST /stores/{storeId}/availabilities 요청 (처음 낼 때) */
export interface NewAvailability extends AvailabilityInput {
  /** 받는 달 "2026-12" */
  month: string
}

// ── 급여 (docs/07 8, P1) ──

/** none 공제 없음 · 3.3 3.3% · ins 4대보험 */
export type TaxType = 'none' | '3.3' | 'ins'

/** 급여 달력의 하루 (근무한 날 · 근무 예정) */
export interface PayWorkDay {
  date: string
  start: string
  end: string
  hours: number
  status: 'worked' | 'planned'
}

/** 주별 근거 (주휴수당은 주 15시간 이상인 주만) */
export interface PayWeek {
  weekStart: string
  hours: number
  weeklyAllowanceEligible: boolean
  weeklyAllowance: number
}

/** GET /stores/{storeId}/payroll/estimates/me */
export interface PayrollEstimate {
  storeId: string
  /** "2026-11" */
  month: string
  hourlyWage: number
  /** 급여일 1~28, 말일은 31. 사장님이 아직 안 정했으면 null */
  payday: number | null
  taxType: TaxType
  weeklyAllowanceEnabled: boolean
  workDays: PayWorkDay[]
  hours: number
  basePay: number
  weeklyAllowance: number
  grossPay: number
  deduction: number
  netPay: number
  weeks: PayWeek[]
  /** AI 쉬운 설명 (계산에는 안 씀). 없으면 null → 설명 카드를 숨긴다 */
  aiNote: string | null
  isEstimate: boolean
}
