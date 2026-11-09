import type { ManualIcon, RecipeTemp, StoreTheme } from '@/lib/api/types'

/*
 * 사장님 화면 API 타입 (임시) — 담당: 나현
 * docs/07 에 아직 사장님 API 가 없어서, 가짜 서버(api/mocks/owner) 모양을 여기 둔다.
 * BE 와 모양이 정해지면 src/lib/api/types.ts 로 옮긴다 (민지와 상의). 이름 규칙은 docs/07 0 공통 약속을 따른다.
 */

/** 사업장 규모: 5인 미만 · 5인 이상 (급여 계산 · 주휴 · 가산 기준) */
export type StoreSize = 'under5' | 'over5'

/** 내가 운영하는 매장 (GET /owner/stores 제안) */
export interface OwnerStore {
  storeId: string
  name: string
  kind: string
  address: string
  theme: StoreTheme | null
  photoUrl: string | null
  /** 급여일 1~31 (31 = 말일) */
  payday: number
  size: StoreSize
  bizNo: string | null
  staffCount: number
}

/** 매장 등록 요청 (POST /stores — BE 는 name · address 필수) */
export interface NewStore {
  name: string
  address: string
  size: StoreSize
  bizNo?: string | null
}

/** 매장 수정 요청 (PATCH /stores/{storeId}) — 급여일 · 규모는 아직 가짜 서버에만 저장 */
export type StoreUpdate = Partial<Pick<OwnerStore, 'name' | 'payday' | 'size'>>

/** BE 매장 응답 (GET · POST · PATCH /stores) */
export interface StoreResponse {
  storeId: string
  name: string
  address: string
  ownerName: string
  businessVerificationId: number | null
  photoUrl: string | null
}

/** BE 초대코드 응답 (POST /stores/{storeId}/invitations) */
export interface InvitationResponse {
  invitationId: string
  storeId: string
  code: string
  staffName: string
  hourlyWage: number
  createdAt: string
}

/** BE 초대코드 목록 한 줄 (GET /stores/{storeId}/invitations) */
export interface InvitationSummary extends InvitationResponse {
  status: 'AVAILABLE' | 'USED' | 'REVOKED'
  acceptedAt: string | null
  revokedAt: string | null
}

/** BE 카톡 공유 정보 (GET /stores/{storeId}/invitations/{invitationId}/share-info) — deepLink 는 /staff/join?code=… */
export interface InviteShareInfo {
  invitationId: string
  code: string
  deepLink: string
}

/** BE 직원 (GET /stores/{storeId}/members) — 퇴사하면 LEFT */
export interface MemberResponse {
  memberId: string
  userId: string
  staffName: string
  role: string
  hourlyWage: number
  status: 'ACTIVE' | 'LEFT'
  joinedAt: string
  leftAt: string | null
}

export interface OwnerProfile {
  name: string
}

/** 직원 상태: active 사용 중 · invited 입장 전(코드 발급만) · removed 퇴사(코드 삭제) */
export type MemberStatus = 'active' | 'invited' | 'removed'

export interface Member {
  /** 입장한 직원은 BE memberId, 입장 전이면 invitationId */
  memberId: string
  /** 입장 전(코드만 발급)일 때 코드 취소에 쓰는 ID. 가짜 서버 · 입장한 직원은 없음 */
  invitationId?: string | null
  storeId: string
  name: string
  hourlyWage: number
  status: MemberStatus
  inviteCode: string
  /** 근무 한 줄 (예: 주 3회 마감) */
  shiftLabel: string
}

/** 알바생 추가 (POST /stores/{storeId}/members 제안) — 응답에 초대코드 */
export interface NewMember {
  name: string
  hourlyWage: number
}

/** 지금 근무 중인 사람 (홈 카드) */
export interface OnDuty {
  name: string
  role: string
  start: string
  end: string
  /** 출근 시각 */
  clockIn: string
}

/** 홈 · 알림의 "확인 필요": AI 가 답하지 못해 알바생이 사장님께 물어본 질문 */
export interface OwnerQuestionItem {
  questionId: string
  storeId: string
  title: string
  question: string
  icon: ManualIcon | null
  staffName: string
  askedAt: string
  status: 'asked' | 'answered'
}

export interface OwnerNotification {
  notificationId: string
  storeId: string
  storeName: string
  kind: 'question' | 'stock'
  title: string
  sub: string
  /** kind 가 question 이면 질문 ID */
  questionId: string | null
}

/** 사장님 답변 (POST /stores/{storeId}/owner-questions/{questionId}/answer). addToManual 이면 매뉴얼도 만든다 (BE 는 아직 501) */
export interface OwnerAnswer {
  answer: string
  addToManual: boolean
  manualTitle: string
}

/** 레시피 등록 · 수정 요청 */
export interface RecipeInput {
  name: string
  category: string
  temp: RecipeTemp
  size: string
  ingredients: { name: string; amount: string }[]
  steps: string[]
  memo: string | null
  /** 메뉴 사진: 새 파일 · null 빼기 · undefined 그대로 (BE 사진 저장 전까지 가짜 서버에만) */
  photo?: File | null
}

/** 사진 → AI 레시피 초안 (POST /stores/{storeId}/recipe-scans). 못 읽은 값은 null → 저장 전에 입력받는다 */
export interface RecipeScanDraft {
  name: string
  category: string | null
  temp: RecipeTemp | null
  size: string | null
  ingredients: { name: string; amount: string | null }[]
  steps: string[]
}

/** 매뉴얼 등록 · 수정 요청 */
export interface ManualInput {
  title: string
  body: string
  icon: ManualIcon | null
}

/** 근무 한 칸 (사장님 달력) */
export interface WorkShift {
  shiftId: string
  date: string
  /** 직원 memberId · 사장님 본인은 'owner' */
  memberId: string
  name: string
  start: string
  end: string
  hours: number
}

export interface MonthShifts {
  month: string
  shifts: WorkShift[]
  /** 날짜별 메모 ("2026-11-20" → 메모) */
  memos: Record<string, string>
}

/** 다음 달 근무 가능 시간 제출 현황 */
export interface AvailabilityStatus {
  month: string
  deadline: string
  submitted: number
  total: number
  missing: string[]
}

/** 추천 스케줄 한 줄 (하루) */
export interface DraftRow {
  date: string
  open: string[]
  close: string[]
  /** 마감 부족 인원 */
  shortage: number
}

export interface ScheduleDraft {
  weekLabel: string
  status: 'none' | 'draft' | 'confirmed'
  rows: DraftRow[]
}

/** BE 직원별 예상 급여 한 줄 (GET /stores/{storeId}/payroll/estimates?month=) — 화면 모양은 MemberPay */
export interface PayrollEstimateSummary {
  estimateId: string
  memberId: string
  staffName: string
  hourlyWage: number
  taxType: 'none' | '3.3' | 'ins'
  hours: number
  basePay: number
  weeklyAllowance: number
  /** 세전 (화면의 total) */
  grossPay: number
  deduction: number
  /** 공제 후 실수령 */
  netPay: number
  weeks: {
    weekStart: string
    hours: number
    weeklyAllowanceEligible: boolean
    weeklyAllowance: number
  }[]
}

export interface PayrollEstimateList {
  storeId: string
  month: string
  payday: number | null
  members: PayrollEstimateSummary[]
  isEstimate: boolean
}

/** 직원 한 명의 이번 달 급여 (참고용, 계산은 코드) */
export interface MemberPay {
  memberId: string
  storeId: string
  name: string
  hours: number
  basePay: number
  weeklyAllowance: number
  total: number
  weeks: { weekStart: string; hours: number; eligible: boolean }[]
}
