import type { ManualIcon, RecipeTemp, ScheduleWorker, StoreTheme } from '@/lib/api/types'

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
  /** 쉬는 요일 0=월 ~ 6=일 (BE 칸 요청 중) */
  closedWeekdays: number[]
  /** 공휴일에 쉬는지 (BE 칸 요청 중) */
  closedOnHolidays: boolean
}

/** 매장 등록 요청 (POST /stores — BE 는 name · address · 사업자 확인 결과 필수) */
export interface NewStore {
  name: string
  address: string
  size: StoreSize
  bizNo?: string | null
  /** 사업자 확인(VERIFIED) 결과 번호 — POST /business-verifications */
  businessVerificationId: number
  /** 근무 타임 (오픈 · 미들 · 마감 …) — 매장과 함께 만든다 */
  shiftTemplates: ShiftTemplateInput[]
  /** 쉬는 요일 0=월 ~ 6=일 (BE 칸 요청 중) */
  closedWeekdays: number[]
  /** 공휴일에 쉬는지 (BE 칸 요청 중) */
  closedOnHolidays: boolean
}

/** 근무 타임 (고정 스케줄 템플릿, /stores/{storeId}/shift-templates). 시간은 HH:MM */
export interface ShiftTemplateInput {
  name: string
  start: string
  end: string
  /** 필요 인원 (BE 칸 요청 중) */
  headcount: number
}

export interface ShiftTemplate extends ShiftTemplateInput {
  templateId: string
  sortOrder: number
}

/** 고정 스케줄 한 칸: 요일(0=월 ~ 6=일) × 근무 타임 */
export interface WeekShift {
  templateId: string
  weekday: number
}

/** 고정 스케줄 배정 (GET /stores/{storeId}/fixed-schedule) — 매주 그 요일 그 타임에 그 사람 */
export interface FixedAssignment {
  assignmentId: string
  template: ShiftTemplate
  weekday: number
  assignee: ScheduleWorker
}

/** 사장님이 받은 대타 요청 (직원이 사장님께 부탁) */
export interface OwnerSubstituteRequest {
  requestId: string
  date: string
  shiftName: string
  start: string
  end: string
  requester: ScheduleWorker
}

/** 사업자 확인 요청 (POST /business-verifications, 국세청 진위확인) */
export interface BizVerifyInput {
  /** 000-00-00000 (BE 가 - 를 뺀다) */
  bizNo: string
  ownerName: string
  /** 개업일 YYYY-MM-DD */
  startDate: string
}

/** 사업자 확인 결과 — VERIFIED 여야 매장을 등록할 수 있다 */
export interface BizVerification {
  verificationId: number
  status: 'VERIFIED' | 'INVALID'
  message: string
}

/** 매장 수정 요청 (PATCH /stores/{storeId}) — 이름 · 급여일 · 사업장 규모 */
export type StoreUpdate = Partial<
  Pick<OwnerStore, 'name' | 'payday' | 'size' | 'photoUrl' | 'closedWeekdays' | 'closedOnHolidays'>
>

/** BE 사업장 규모 (화면 StoreSize: under5 · over5) */
export type BusinessSize = 'UNDER_FIVE' | 'FIVE_OR_MORE'

/** BE 매장 응답 (GET · POST · PATCH /stores). 급여일은 1~28 · 31(말일), 안 정했으면 null */
export interface StoreResponse {
  storeId: string
  name: string
  address: string
  ownerName: string
  businessVerificationId: number | null
  photoUrl: string | null
  payday: number | null
  businessSize: BusinessSize | null
  /** BE 칸 요청 중 — 생기기 전에는 오지 않는다 */
  closedWeekdays?: number[] | null
  closedOnHolidays?: boolean | null
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
  /** 입장할 때 쓴 초대코드 (BE #23) */
  invitationId: string | null
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
  /** 입장 전에 정해 둔 고정 근무 (초대할 때, BE 칸이 생기기 전에는 가짜 서버만) */
  schedule?: WeekShift[]
}

/** 알바생 추가 (POST /stores/{storeId}/members 제안) — 응답에 초대코드 */
export interface NewMember {
  name: string
  hourlyWage: number
  /** 입장하면 들어갈 고정 근무 (선택) — canSaveInviteSchedule() 일 때만 보낸다 */
  schedule?: WeekShift[]
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
  /** 사진에 레시피가 더 있어서 맨 위 하나만 읽었는지 (BE #26) */
  hasMoreRecipes?: boolean
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
  /** 오픈 부족 인원 (진짜 API 추천은 오픈도 모자랄 수 있다) */
  openShortage?: number
}

export interface ScheduleDraft {
  weekLabel: string
  status: 'none' | 'draft' | 'confirmed'
  rows: DraftRow[]
  /** 진짜 API: 확정할 추천 ID */
  recommendationId?: string
}

/** BE 근무 칸에 배정된 직원 */
export interface ScheduleAssignment {
  memberId: string
  staffName: string
}

/** BE 추천 스케줄 요약 (GET /stores/{storeId}/schedule-recommendations) */
export interface RecommendationSummary {
  recommendationId: string
  batchId: string
  candidateNo: number
  startDate: string
  endDate: string
  unfilledSlots: number
  createdAt: string
}

/** BE 추천 스케줄 상세 */
export interface RecommendationDetail extends RecommendationSummary {
  shifts: {
    shiftId: string
    date: string
    start: string
    end: string
    role: string
    requiredStaff: number
    assignments: ScheduleAssignment[]
  }[]
  warnings: string[]
}

/** BE 확정 스케줄 (GET · POST · PATCH /stores/{storeId}/schedules) */
export interface ScheduleResponse {
  scheduleId: string
  recommendationId: string | null
  name: string
  startDate: string
  endDate: string
  status: 'draft' | 'published'
  publishedAt: string | null
  shifts: {
    shiftId: string
    date: string
    start: string
    end: string
    role: string
    assignments: ScheduleAssignment[]
  }[]
}

/** BE 근무 가능 시간 제출 현황 (GET /stores/{storeId}/availability-submissions?month=) */
export interface AvailabilitySubmissions {
  month: string
  deadline: string
  totalMembers: number
  submittedCount: number
  members: { memberId: string; staffName: string; submitted: boolean; submittedAt: string | null }[]
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
