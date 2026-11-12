import {
  AVAILABILITY_MONTH,
  DRAFT_WEEK_LABEL,
  MIN_WAGE,
  OWNER_TODAY,
  PAY_WEEK_STARTS,
  SCAN_DRAFT,
  draftRows,
  monthHours,
  onDuty,
  seedMembers,
  seedProfile,
  seedQuestions,
  seedStockNotices,
  seedStores,
  shiftPatterns,
  availabilityStatus,
} from '@/api/mocks/owner/data'
import { manuals as staffManuals, type Manual as StaffManual } from '@/api/mocks/staff/manuals'
import {
  recipes as staffRecipes,
  type Recipe as StaffRecipe,
  type RecipeCategory,
} from '@/api/mocks/staff/recipes'
import { seedStoreShifts } from '@/api/mocks/owner/schedule'
import { ApiError } from '@/lib/apiClient'
import { questionSentence } from '@/pages/owner/components/questionText'
import { fromDateKey, toDateKey } from '@/lib/date'
import type { StoreTheme } from '@/lib/api/types'
import type {
  AvailabilityStatus,
  BizVerification,
  BizVerifyInput,
  ManualInput,
  Member,
  MemberPay,
  MonthShifts,
  NewMember,
  NewStore,
  OnDuty,
  OwnerAnswer,
  OwnerNotification,
  OwnerProfile,
  OwnerQuestionItem,
  OwnerStore,
  RecipeInput,
  RecipeScanDraft,
  ScheduleDraft,
  StoreUpdate,
  WeekShift,
  WorkShift,
} from '@/pages/owner/api/types'
import { TAX_RATE, type TaxType } from '@/pages/owner/payroll/tax'

/*
 * 가짜 서버: 사장님 화면 API (제안 모양: src/pages/owner/api/types.ts) — 담당: 나현
 * 메모리에만 저장해서 새로고침하면 처음으로 돌아간다.
 * 레시피 · 매뉴얼 등록 · 수정 · 삭제는 알바 화면 가짜 데이터(api/mocks/staff)에 바로 반영해서
 * 사장님이 바꾸면 알바 화면 · AI 사수 답변에도 보인다 (BE 연결 전 시연용).
 */

const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

function fail(status: number, code: string, message: string, detail: unknown = null): never {
  throw new ApiError(status, { code, message, detail })
}

const db = {
  profile: { ...seedProfile },
  stores: seedStores.map((s) => ({ ...s })),
  members: seedMembers.map((m) => ({ ...m })),
  questions: seedQuestions.map((q) => ({ ...q })),
  dismissed: new Set<string>(),
  addedShifts: [] as (WorkShift & { storeId: string })[],
  deletedShiftIds: new Set<string>(),
  memos: {} as Record<string, string>,
  drafts: {} as Record<string, { status: 'draft' | 'confirmed'; filled: string[] }>,
}

// ── 매장 · 프로필 ──

const THEME_ORDER: StoreTheme[] = ['moon', 'sunset']

function toStore(store: (typeof db.stores)[number]): OwnerStore {
  const staffCount = db.members.filter(
    (m) => m.storeId === store.storeId && m.status !== 'removed',
  ).length
  return { ...store, staffCount }
}

function findStore(storeId: string) {
  const store = db.stores.find((s) => s.storeId === storeId)
  if (!store) fail(404, 'NOT_FOUND', '매장을 찾지 못했어요')
  return store
}

/** GET /owner/stores (제안) */
export async function getOwnerStores(): Promise<{ stores: OwnerStore[] }> {
  await wait()
  return { stores: db.stores.map(toStore) }
}

/** POST /stores — 매장 등록 (BE 는 name · address 필수) */
export async function createStore(input: NewStore): Promise<OwnerStore> {
  await wait(500)
  const name = input.name.trim()
  if (!name) fail(422, 'VALIDATION_ERROR', '매장 이름을 입력해 주세요')
  if (!input.address.trim()) fail(422, 'VALIDATION_ERROR', '매장 주소를 입력해 주세요')
  const store = {
    storeId: `str_${Date.now()}`,
    name,
    kind: '카페',
    address: input.address.trim(),
    theme: THEME_ORDER[db.stores.length % THEME_ORDER.length],
    photoUrl: null as string | null,
    payday: 10,
    size: input.size,
    bizNo: input.bizNo ?? null,
    closedWeekdays: input.closedWeekdays,
    closedOnHolidays: input.closedOnHolidays,
  }
  db.stores.push(store)
  seedStoreShifts(store.storeId, input.shiftTemplates, db.profile.name)
  return toStore(store)
}

/** POST /stores/{storeId}/photo — 시연은 브라우저 주소로 */
export async function uploadStorePhoto(
  _storeId: string,
  file: File,
): Promise<{ photoUrl: string }> {
  await wait(600)
  return { photoUrl: URL.createObjectURL(file) }
}

/** PATCH /stores/{storeId} (제안) — 이름 · 급여일 · 사업장 규모 */
export async function updateStore(storeId: string, patch: StoreUpdate): Promise<OwnerStore> {
  await wait()
  const store = findStore(storeId)
  if (patch.name !== undefined && !patch.name.trim()) {
    fail(422, 'VALIDATION_ERROR', '매장 이름을 입력해 주세요')
  }
  Object.assign(store, patch)
  return toStore(store)
}

/** DELETE /stores/{storeId} (제안) — 직원은 퇴사 처리(기록은 남김) */
export async function deleteStore(storeId: string): Promise<void> {
  await wait()
  if (db.stores.length <= 1) fail(409, 'LAST_STORE', '매장이 하나뿐이라 삭제할 수 없어요')
  db.stores = db.stores.filter((s) => s.storeId !== storeId)
  db.members.forEach((m) => {
    if (m.storeId === storeId) m.status = 'removed'
  })
}

/** POST /business-numbers/verify (제안, P2 국세청 상태조회) — 시연: 10자리면 정상 */
export async function verifyBizNo(input: BizVerifyInput): Promise<BizVerification> {
  await wait(1200)
  if (input.bizNo.replace(/\D/g, '').length !== 10) {
    fail(422, 'BIZ_NO_INVALID', '사업자등록번호 10자리를 입력해 주세요')
  }
  // 시연: 10자리면 모두 확인된 사업자로 본다
  return { verificationId: Date.now(), status: 'VERIFIED', message: '' }
}

export async function getProfile(): Promise<OwnerProfile> {
  await wait(150)
  return { ...db.profile }
}

export async function updateProfile(name: string): Promise<OwnerProfile> {
  await wait()
  if (!name.trim()) fail(422, 'VALIDATION_ERROR', '이름을 입력해 주세요')
  db.profile.name = name.trim()
  return { ...db.profile }
}

// ── 직원 · 초대코드 ──

/** 헷갈리는 0 · O · 1 · I 를 뺀 6자리 (docs/03 S4) */
function newInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const used = new Set(db.members.map((m) => m.inviteCode))
  const make = () =>
    Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  let code = make()
  while (used.has(code)) code = make()
  return code
}

function checkWage(wage: number) {
  if (!Number.isFinite(wage) || wage < MIN_WAGE) {
    fail(422, 'WAGE_BELOW_MINIMUM', `최저시급 ${MIN_WAGE.toLocaleString('ko-KR')}원보다 낮아요`)
  }
}

/** GET /stores/{storeId}/members (제안) — 퇴사한 직원은 빼고 */
export async function getMembers(storeId: string): Promise<{ members: Member[] }> {
  await wait()
  return {
    members: db.members
      .filter((m) => m.storeId === storeId && m.status !== 'removed')
      .map((m) => ({ ...m })),
  }
}

/** POST /stores/{storeId}/members (제안) — 알바생 추가 + 초대코드 발급 */
export async function createMember(storeId: string, input: NewMember): Promise<Member> {
  await wait(500)
  findStore(storeId)
  if (!input.name.trim()) fail(422, 'VALIDATION_ERROR', '이름을 입력해 주세요')
  checkWage(input.hourlyWage)
  const member: Member = {
    memberId: `mbr_${Date.now()}`,
    storeId,
    name: input.name.trim(),
    hourlyWage: input.hourlyWage,
    status: 'invited',
    inviteCode: newInviteCode(),
    shiftLabel: '새 알바생',
    schedule: input.schedule ?? [],
  }
  db.members.push(member)
  return { ...member }
}

/** PATCH /stores/{storeId}/invitations/{invitationId} — 입장 전 직원의 고정 근무 고치기 (BE #38) */
export async function updateInviteSchedule(
  memberId: string,
  schedule: WeekShift[],
): Promise<Member> {
  await wait()
  const member = db.members.find((m) => m.memberId === memberId)
  if (!member || member.status !== 'invited')
    fail(409, 'INVITATION_NOT_EDITABLE', '이미 입장했거나 취소된 초대예요')
  member.schedule = schedule
  return { ...member }
}

/** PUT /stores/{storeId}/members/{memberId}/hourly-wage (docs/07 8-2) */
export async function updateHourlyWage(memberId: string, hourlyWage: number): Promise<Member> {
  await wait()
  const member = db.members.find((m) => m.memberId === memberId)
  if (!member) fail(404, 'NOT_FOUND', '직원을 찾지 못했어요')
  checkWage(hourlyWage)
  member.hourlyWage = hourlyWage
  return { ...member }
}

/** PUT /stores/{storeId}/members/{memberId}/tax-type (BE 요청 중) — 급여 공제 */
export async function updateTaxType(memberId: string, taxType: TaxType): Promise<Member> {
  await wait()
  const member = db.members.find((m) => m.memberId === memberId)
  if (!member) fail(404, 'NOT_FOUND', '직원을 찾지 못했어요')
  if (member.status !== 'active') fail(400, 'MEMBER_NOT_JOINED', '입장한 뒤에 정할 수 있어요')
  member.taxType = taxType
  return { ...member }
}

/** DELETE /stores/{storeId}/members/{memberId}/invitation (제안) — 초대코드 삭제 · 퇴사, 기록은 남김 */
export async function removeMember(memberId: string): Promise<void> {
  await wait()
  const member = db.members.find((m) => m.memberId === memberId)
  if (!member) fail(404, 'NOT_FOUND', '직원을 찾지 못했어요')
  member.status = 'removed'
}

// ── 홈 · 알림 · 사장님께 온 질문 ──

const memberName = (memberId: string) =>
  memberId === 'owner' ? '사장님' : (db.members.find((m) => m.memberId === memberId)?.name ?? '')

/** GET /stores/{storeId}/on-duty (제안) — 지금 근무 중 */
export async function getOnDuty(storeId: string): Promise<{ onDuty: OnDuty | null }> {
  await wait(150)
  const now = onDuty[storeId]
  const pattern = shiftPatterns[storeId]?.find((p) => p.memberId === now?.memberId)
  if (!now || !pattern) return { onDuty: null }
  const member = db.members.find((m) => m.memberId === now.memberId)
  if (!member || member.status === 'removed') return { onDuty: null }
  return {
    onDuty: {
      name: member.name,
      role: pattern.start >= '15:00' ? '마감' : '오픈',
      start: pattern.start,
      end: pattern.end,
      clockIn: now.clockIn,
    },
  }
}

/** GET /stores/{storeId}/owner-questions?status=asked */
export async function getOwnerQuestions(
  storeId: string,
): Promise<{ questions: OwnerQuestionItem[] }> {
  await wait(150)
  return {
    questions: db.questions
      .filter((q) => q.storeId === storeId && q.status === 'asked')
      .map((q) => ({ ...q })),
  }
}

/** POST /stores/{storeId}/owner-questions/{questionId}/answer — 알바생 채팅에 답이 가고, 고르면 매뉴얼에 추가 */
export async function answerOwnerQuestion(
  storeId: string,
  questionId: string,
  input: OwnerAnswer,
): Promise<OwnerQuestionItem> {
  await wait(400)
  const question = db.questions.find((q) => q.storeId === storeId && q.questionId === questionId)
  if (!question) fail(404, 'NOT_FOUND', '질문을 찾지 못했어요')
  if (!input.answer.trim()) fail(422, 'VALIDATION_ERROR', '답변을 입력해 주세요')
  question.status = 'answered'
  if (input.addToManual) {
    pushManual(question.storeId, {
      title: input.manualTitle.trim() || question.title,
      body: input.manualBody.trim() || input.answer.trim(),
      icon: question.icon,
    })
  }
  return { ...question }
}

/** GET /owner/notifications (제안) — 모든 내 매장의 확인 필요 질문 + 재고 알림 */
export async function getNotifications(): Promise<{ notifications: OwnerNotification[] }> {
  await wait(150)
  const storeName = (id: string) => db.stores.find((s) => s.storeId === id)?.name ?? ''
  const fromQuestions: OwnerNotification[] = db.questions
    .filter((q) => q.status === 'asked' && db.stores.some((s) => s.storeId === q.storeId))
    .map((q) => ({
      notificationId: `ntf_${q.questionId}`,
      storeId: q.storeId,
      storeName: storeName(q.storeId),
      kind: 'question',
      title: questionSentence(q.question, 14),
      sub: `${q.staffName} · ${q.askedAt.slice(11, 16)}`,
      questionId: q.questionId,
    }))
  const notices: OwnerNotification[] = seedStockNotices
    .filter((n) => !db.dismissed.has(n.notificationId))
    .filter((n) => db.stores.some((s) => s.storeId === n.storeId))
    .map((n) => ({ ...n, storeName: storeName(n.storeId), kind: 'stock', questionId: null }))
  return { notifications: [...fromQuestions, ...notices] }
}

/**
 * GET /stores/{storeId}/notifications 의 사장님 인수인계 알림 (BE #34 HANDOVER_CREATED) — 시연: 달빛 카페 민수 1개.
 * POST …/notifications/read 하면 읽음
 */
const handoverNotices = [
  {
    notificationId: 'HANDOVER_CREATED:hnd_demo',
    storeId: 'dalbit',
    title: '민수님이 인수인계를 남겼어요',
    body: '우유 2팩 남음 · 외상 1건 (단골 김OO님 아메리카노)',
    createdAt: '2026-11-20T08:40:00Z',
    isRead: false,
  },
]

export async function getHandoverNotices(storeId: string) {
  await wait(150)
  return handoverNotices.filter((n) => n.storeId === storeId).map((n) => ({ ...n }))
}

export async function readHandoverNotices(storeId: string): Promise<void> {
  await wait(150)
  handoverNotices.forEach((n) => {
    if (n.storeId === storeId) n.isRead = true
  })
}

/** POST /owner/notifications/{id}/read (제안) */
export async function dismissNotification(notificationId: string): Promise<void> {
  await wait(150)
  db.dismissed.add(notificationId)
}

// ── 레시피 · 매뉴얼 등록 · 수정 · 삭제 (알바 가짜 데이터에 반영) ──

function toStaffRecipe(
  storeId: string,
  id: string,
  input: RecipeInput,
  imageUrl: string | null | undefined,
): StaffRecipe {
  return {
    id,
    storeId,
    imageUrl,
    name: input.name.trim(),
    // 알바 가짜 데이터는 카테고리 6개만 알지만, 사장님이 정한 이름을 그대로 둔다
    category: input.category as RecipeCategory,
    temp: input.temp,
    size: input.size,
    ingredients: input.ingredients
      .filter((i) => i.name.trim())
      .map((i) => [i.name.trim(), i.amount.trim() || '-'] as [string, string]),
    steps: input.steps.map((s) => s.trim()).filter(Boolean),
    memo: input.memo?.trim() || undefined,
    isNew: true,
  }
}

function checkRecipe(input: RecipeInput) {
  if (!input.name.trim()) fail(422, 'VALIDATION_ERROR', '메뉴 이름을 입력해 주세요')
}

/*
 * 메뉴 사진 → 레시피 imageUrl (알바 · 사장 카드 · 목록이 lib/api/recipes 를 거쳐 보여 준다)
 * - 새 사진: 브라우저 주소(blob:) · 뺌: '' (빈 값이면 시연 사진도 안 쓰고 아이콘) · 그대로: 원래 값
 * - imageUrl 이 없으면(undefined · null) lib/api/recipes 가 메뉴 이름으로 시연 사진을 찾는다
 */
function photoUrl(before: string | null | undefined, photo: File | null | undefined) {
  if (photo === undefined) return before
  if (before?.startsWith('blob:')) URL.revokeObjectURL(before)
  return photo ? URL.createObjectURL(photo) : ''
}

/** POST /stores/{storeId}/recipes (제안) */
export async function createRecipe(storeId: string, input: RecipeInput) {
  await wait(400)
  checkRecipe(input)
  const recipe = toStaffRecipe(
    storeId,
    `rcp_${Date.now()}`,
    input,
    photoUrl(undefined, input.photo),
  )
  staffRecipes.push(recipe)
  return { recipeId: recipe.id }
}

function recipeIndex(storeId: string, recipeId: string) {
  const index = staffRecipes.findIndex((r) => r.storeId === storeId && r.id === recipeId)
  if (index < 0) fail(404, 'NOT_FOUND', '레시피를 찾지 못했어요')
  return index
}

/** PATCH /stores/{storeId}/recipes/{recipeId} (제안) */
export async function updateRecipe(storeId: string, recipeId: string, input: RecipeInput) {
  await wait(400)
  checkRecipe(input)
  const index = recipeIndex(storeId, recipeId)
  const imageUrl = photoUrl(staffRecipes[index].imageUrl, input.photo)
  staffRecipes[index] = toStaffRecipe(storeId, recipeId, input, imageUrl)
  return { recipeId }
}

/** DELETE /stores/{storeId}/recipes/{recipeId} (제안) — 알바 화면에서도 사라진다 */
export async function deleteRecipe(storeId: string, recipeId: string): Promise<void> {
  await wait()
  staffRecipes.splice(recipeIndex(storeId, recipeId), 1)
}

/** POST /stores/{storeId}/recipe-scans (P1 비전 LLM) — 사진 → AI 초안 (저장 안 함). 시연: 늘 같은 초안 */
export async function scanRecipePhoto(): Promise<RecipeScanDraft> {
  await wait(1800)
  return structuredClone(SCAN_DRAFT)
}

function pushManual(storeId: string, input: ManualInput) {
  const manual = {
    id: `man_${Date.now()}`,
    storeId,
    // 직접 추가한 매뉴얼은 아이콘 null (API 모양). 알바 가짜 데이터 타입은 아이콘이 꼭 있어서 맞춰 준다
    icon: input.icon as StaffManual['icon'],
    title: input.title.trim(),
    body: input.body.trim(),
    isNew: true,
    // 알바 화면 가짜 AI 가 이 매뉴얼로 답할 수 있게
    keywords: [input.title.trim()],
    answer: input.body.trim(),
  }
  // 새 매뉴얼이 맨 앞 (docs/07 4-1: 최신 순)
  staffManuals.unshift(manual)
  return manual
}

function checkManual(storeId: string, input: ManualInput, exceptId?: string) {
  if (!input.title.trim() || !input.body.trim()) {
    fail(422, 'VALIDATION_ERROR', '제목과 내용을 입력해 주세요')
  }
  const dup = staffManuals.some(
    (m) => m.storeId === storeId && m.id !== exceptId && m.title === input.title.trim(),
  )
  if (dup) fail(409, 'MANUAL_TITLE_EXISTS', '이미 있는 제목이에요')
}

/** POST /stores/{storeId}/manuals (제안) */
export async function createManual(storeId: string, input: ManualInput) {
  await wait(400)
  checkManual(storeId, input)
  return { manualId: pushManual(storeId, input).id }
}

function manualIndex(storeId: string, manualId: string) {
  const index = staffManuals.findIndex((m) => m.storeId === storeId && m.id === manualId)
  if (index < 0) fail(404, 'NOT_FOUND', '매뉴얼을 찾지 못했어요')
  return index
}

/** PATCH /stores/{storeId}/manuals/{manualId} (제안) */
export async function updateManual(storeId: string, manualId: string, input: ManualInput) {
  await wait(400)
  checkManual(storeId, input, manualId)
  const index = manualIndex(storeId, manualId)
  const [old] = staffManuals.splice(index, 1)
  staffManuals.unshift({
    ...old,
    title: input.title.trim(),
    body: input.body.trim(),
    isNew: true,
    keywords: [input.title.trim()],
    answer: input.body.trim(),
  })
  return { manualId }
}

/** DELETE /stores/{storeId}/manuals/{manualId} (제안) — 알바 화면 · AI 답변에서도 사라진다 */
export async function deleteManual(storeId: string, manualId: string): Promise<void> {
  await wait()
  staffManuals.splice(manualIndex(storeId, manualId), 1)
}

// ── 근무 (달력 · 추천 스케줄) ──

const minutes = (t: string) => {
  const [h, mm] = t.split(':').map(Number)
  return h * 60 + mm
}
const hoursBetween = (start: string, end: string) => (minutes(end) - minutes(start)) / 60

function patternShifts(storeId: string, month: string): WorkShift[] {
  const [y, mo] = month.split('-').map(Number)
  const last = new Date(y, mo, 0).getDate()
  const list: WorkShift[] = []
  const active = (memberId: string) =>
    memberId === 'owner' || db.members.some((m) => m.memberId === memberId && m.status === 'active')
  for (let day = 1; day <= last; day++) {
    const date = new Date(y, mo - 1, day)
    for (const p of shiftPatterns[storeId] ?? []) {
      if (!p.dows.includes(date.getDay()) || !active(p.memberId)) continue
      const key = toDateKey(date)
      list.push({
        shiftId: `gen|${storeId}|${p.memberId}|${key}`,
        date: key,
        memberId: p.memberId,
        name: memberName(p.memberId),
        start: p.start,
        end: p.end,
        hours: hoursBetween(p.start, p.end),
      })
    }
  }
  return list
}

/** GET /stores/{storeId}/schedules?month=2026-11 (제안) — 매장 전체 근무 */
export async function getMonthShifts(storeId: string, month: string): Promise<MonthShifts> {
  await wait(200)
  const shifts = [
    ...patternShifts(storeId, month),
    ...db.addedShifts.filter((s) => s.storeId === storeId && s.date.startsWith(month)),
  ]
    .filter((s) => !db.deletedShiftIds.has(s.shiftId))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    .map(({ shiftId, date, memberId, name, start, end, hours }) => ({
      shiftId,
      date,
      memberId,
      name,
      start,
      end,
      hours,
    }))
  return { month, shifts, memos: dayMemos(storeId, month) }
}

/** 날짜 메모 (BE 없음 — 진짜 근무 달력에서도 이 브라우저에만 남는다) */
function dayMemos(storeId: string, month: string) {
  const memos: Record<string, string> = {}
  for (const [key, text] of Object.entries(db.memos)) {
    const [sid, date] = key.split('|')
    if (sid === storeId && date.startsWith(month)) memos[date] = text
  }
  return memos
}

export async function getDayMemos(storeId: string, month: string) {
  return dayMemos(storeId, month)
}

/** POST /stores/{storeId}/schedules (제안) — 근무 한 칸 추가 */
export async function addShift(
  storeId: string,
  input: { date: string; memberId: string; start: string; end: string },
): Promise<WorkShift> {
  await wait()
  if (minutes(input.end) <= minutes(input.start)) {
    fail(422, 'VALIDATION_ERROR', '끝나는 시간은 시작 시간 뒤여야 해요')
  }
  const shift = {
    shiftId: `add_${Date.now()}`,
    storeId,
    ...input,
    name: memberName(input.memberId),
    hours: hoursBetween(input.start, input.end),
  }
  db.addedShifts.push(shift)
  return shift
}

/** DELETE /stores/{storeId}/schedules/{shiftId} (제안) */
export async function deleteShift(storeId: string, shiftId: string): Promise<void> {
  await wait()
  db.addedShifts = db.addedShifts.filter((s) => s.shiftId !== shiftId)
  db.deletedShiftIds.add(shiftId)
  void storeId
}

/** PUT /stores/{storeId}/schedule-memos/{date} (제안) */
export async function saveDayMemo(storeId: string, date: string, text: string): Promise<void> {
  await wait(150)
  db.memos[`${storeId}|${date}`] = text
}

/** GET /stores/{storeId}/availabilities/status (제안) — 다음 달 가능 시간 제출 현황 */
export async function getAvailabilityStatus(storeId: string): Promise<AvailabilityStatus> {
  await wait(150)
  const members = db.members.filter((m) => m.storeId === storeId && m.status !== 'removed')
  const submittedIds = availabilityStatus[storeId]?.submittedIds ?? []
  return {
    ...AVAILABILITY_MONTH,
    submitted: members.filter((m) => submittedIds.includes(m.memberId)).length,
    total: members.length,
    missing: members.filter((m) => !submittedIds.includes(m.memberId)).map((m) => m.name),
  }
}

function toDraft(storeId: string): ScheduleDraft {
  const state = db.drafts[storeId]
  if (!state) return { weekLabel: DRAFT_WEEK_LABEL, status: 'none', rows: [] }
  return {
    weekLabel: DRAFT_WEEK_LABEL,
    status: state.status,
    rows: (draftRows[storeId] ?? []).map((row) =>
      state.filled.includes(row.date) && row.shortage > 0
        ? { ...row, close: [...row.close, '사장님'], shortage: 0 }
        : row,
    ),
  }
}

/** GET /stores/{storeId}/schedule-drafts/latest (제안) */
export async function getScheduleDraft(storeId: string): Promise<ScheduleDraft> {
  await wait(150)
  return toDraft(storeId)
}

/** POST /stores/{storeId}/schedule-drafts (제안, P1) — 가능 시간으로 추천 1개 */
export async function createScheduleDraft(storeId: string): Promise<ScheduleDraft> {
  await wait(1000)
  db.drafts[storeId] = { status: 'draft', filled: [] }
  return toDraft(storeId)
}

/** PATCH …/schedule-drafts/latest (제안) — 부족한 칸에 사장님 배정 */
export async function fillDraftShortage(storeId: string, date: string): Promise<ScheduleDraft> {
  await wait(200)
  const state = db.drafts[storeId]
  if (!state || state.status === 'confirmed') fail(409, 'DRAFT_LOCKED', '확정한 근무표예요')
  state.filled.push(date)
  return toDraft(storeId)
}

/** POST …/schedule-drafts/latest/confirm (제안) — 확정하고 알바생에게 알림 */
export async function confirmScheduleDraft(storeId: string): Promise<ScheduleDraft> {
  await wait(500)
  const state = db.drafts[storeId]
  if (!state) fail(404, 'NOT_FOUND', '추천 스케줄을 먼저 만들어 주세요')
  if (toDraft(storeId).rows.some((r) => r.shortage > 0)) {
    fail(409, 'DRAFT_SHORTAGE', '부족한 칸을 먼저 채워 주세요')
  }
  state.status = 'confirmed'
  return toDraft(storeId)
}

// ── 급여 (참고용, 계산은 코드) ──

const round10 = (n: number) => Math.round(n / 10) * 10

/** GET /stores/{storeId}/payroll/estimates?month=2026-11 (제안) — 직원별 이번 달 급여 */
export async function getStorePayroll(
  storeId: string,
  month: string = OWNER_TODAY.slice(0, 7),
): Promise<{ month: string; members: MemberPay[] }> {
  await wait(200)
  // 시연 데이터는 이번 달(OWNER_TODAY)만 있다. 다른 달은 근무 기록이 없는 것으로
  if (month !== OWNER_TODAY.slice(0, 7)) return { month, members: [] }
  const members = db.members
    .filter((m) => m.storeId === storeId && m.status === 'active' && monthHours[m.memberId])
    .map((m) => {
      const weeks = monthHours[m.memberId].map((hours, i) => ({
        weekStart: PAY_WEEK_STARTS[i],
        hours,
        eligible: hours >= 15,
      }))
      const hours = weeks.reduce((sum, w) => sum + w.hours, 0)
      const basePay = hours * m.hourlyWage
      // 주휴수당 = 주 근무시간 / 40 × 8시간 × 시급 (주 15시간 이상인 주만)
      const weeklyAllowance = round10(
        weeks.filter((w) => w.eligible).reduce((sum, w) => sum + (w.hours / 5) * m.hourlyWage, 0),
      )
      const total = basePay + weeklyAllowance
      const taxType = m.taxType ?? 'none'
      // 공제는 10원 단위로 (BE 와 같게)
      const deduction = round10(total * TAX_RATE[taxType])
      return {
        memberId: m.memberId,
        storeId,
        name: m.name,
        hours,
        basePay,
        weeklyAllowance,
        total,
        taxType,
        deduction,
        netPay: total - deduction,
        weeks,
      }
    })
  return { month, members }
}

/** 시연 기준 오늘 (서버 시간) */
export function ownerToday() {
  return fromDateKey(OWNER_TODAY)
}
