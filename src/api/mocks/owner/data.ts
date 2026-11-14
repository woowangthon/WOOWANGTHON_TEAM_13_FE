import type { ManualIcon } from '@/lib/api/types'
import type { DraftRow, Member, OwnerQuestionItem, OwnerStore } from '@/pages/owner/api/types'

// 가짜 데이터: 사장님 화면 (박 사장님 · 달빛 카페 + 달빛 로스터스) — BE 연결 전까지 사용
// 달빛 카페(dalbit)는 알바 화면 가짜 데이터와 같은 매장이라 레시피 · 매뉴얼 · 인수인계를 함께 쓴다

/** 시연 기준 오늘 */
export const OWNER_TODAY = '2026-11-20'

export const MIN_WAGE = 10320

export const seedProfile = { name: '박서준' }

export const seedStores: Omit<OwnerStore, 'staffCount'>[] = [
  {
    storeId: 'dalbit',
    name: '달빛 카페',
    kind: '카페',
    address: '서울 마포구 와우산로21길 8',
    theme: 'moon',
    photoUrl: '/images/cafe-dalbit.jpg',
    payday: 20,
    size: 'under5',
    bizNo: '105-12-34567',
    closedWeekdays: [],
    closedOnHolidays: false,
    createdAt: '2026-09-01T09:00:00+09:00',
  },
  {
    storeId: 'roasters',
    name: '달빛 로스터스',
    kind: '로스터리 카페',
    address: '서울 마포구 동교로 41',
    theme: 'sunset',
    photoUrl: null,
    payday: 25,
    size: 'under5',
    bizNo: '105-98-76543',
    // 시연: 로스터스는 월요일 · 공휴일 휴무
    closedWeekdays: [0],
    closedOnHolidays: true,
    createdAt: '2026-10-15T09:00:00+09:00',
  },
]

export const seedMembers: Member[] = [
  m('mbr_jieun', 'dalbit', '지은', 10320, 'active', 'K7P2QX', '주 3회 마감'),
  m('mbr_minsu', 'dalbit', '민수', 10320, 'active', 'P5RM2W', '주 4회 오픈'),
  m('mbr_seoyeon', 'dalbit', '서연', 10320, 'active', 'T8VN4K', '주말 오후'),
  m('mbr_doyun', 'dalbit', '도윤', 10500, 'invited', 'H4MW8R', '12월부터'),
  m('mbr_hajun', 'roasters', '하준', 10500, 'active', 'R5TY7B', '주 4회 오전'),
  m('mbr_yuna', 'roasters', '유나', 10320, 'active', 'Y2NQ6C', '주말 종일'),
]

function m(
  memberId: string,
  storeId: string,
  name: string,
  hourlyWage: number,
  status: Member['status'],
  inviteCode: string,
  shiftLabel: string,
): Member {
  // 시연: 지은 3.3% · 민수 4대보험, 나머지는 공제 없음 (입장 전은 없음)
  const taxType =
    status !== 'active'
      ? undefined
      : memberId === 'mbr_jieun'
        ? '3.3'
        : memberId === 'mbr_minsu'
          ? 'ins'
          : 'none'
  return { memberId, storeId, name, hourlyWage, status, inviteCode, shiftLabel, taxType }
}

/** 고정 근무 (요일 0=일 … 6=토). 'owner' 는 사장님 본인 근무 */
export const shiftPatterns: Record<
  string,
  { memberId: string; dows: number[]; start: string; end: string }[]
> = {
  dalbit: [
    { memberId: 'mbr_jieun', dows: [1, 3, 5], start: '18:00', end: '23:00' },
    { memberId: 'mbr_minsu', dows: [1, 2, 3, 4], start: '09:00', end: '13:30' },
    { memberId: 'mbr_seoyeon', dows: [0, 6], start: '13:00', end: '18:00' },
    { memberId: 'owner', dows: [2, 4], start: '15:00', end: '18:00' },
  ],
  roasters: [
    { memberId: 'mbr_hajun', dows: [1, 2, 4, 5], start: '09:00', end: '12:00' },
    { memberId: 'mbr_yuna', dows: [0, 6], start: '10:00', end: '14:30' },
    { memberId: 'owner', dows: [6], start: '10:00', end: '14:00' },
  ],
}

/** 지금 근무 중 (홈 사진 카드) */
export const onDuty: Record<string, { memberId: string; clockIn: string } | null> = {
  dalbit: { memberId: 'mbr_jieun', clockIn: '17:56' },
  roasters: null,
}

/** 이번 달 주별 근무 시간 (급여 계산 근거). 주휴수당은 주 15시간 이상인 주만 */
export const monthHours: Record<string, number[]> = {
  mbr_jieun: [12, 15, 15, 15],
  mbr_minsu: [18, 18, 18, 18],
  mbr_seoyeon: [10, 10, 10, 10],
  mbr_hajun: [12, 12, 12, 12],
  mbr_yuna: [9, 9, 9, 9],
}

export const PAY_WEEK_STARTS = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23']

export const seedQuestions: OwnerQuestionItem[] = [
  {
    questionId: 'oq_umb',
    storeId: 'dalbit',
    title: '우산 대여 문의',
    question: '손님이 비 와서 우산 빌려 달래요',
    icon: 'umbrella',
    staffName: '지은',
    askedAt: '2026-11-20T19:40:00+09:00',
    status: 'asked',
  },
]

/** 재고 같은 그 밖의 알림 (확인하면 사라짐) */
export const seedStockNotices = [
  {
    notificationId: 'ntf_bean',
    storeId: 'roasters',
    title: '원두 재고 부족',
    sub: '하준 · 18:20',
  },
]

/** 추천 스케줄 (12월 3주차). 12/16 마감 1명 부족 */
export const draftRows: Record<string, DraftRow[]> = {
  dalbit: [
    row('2026-12-15', ['민수'], ['지은', '도윤']),
    row('2026-12-16', ['민수'], ['민수'], 1),
    row('2026-12-17', ['민수'], ['지은', '도윤']),
    row('2026-12-18', ['민수'], ['서연', '도윤']),
    row('2026-12-19', ['민수'], ['지은', '민수']),
    row('2026-12-20', ['서연', '도윤'], ['지은', '민수']),
    row('2026-12-21', ['서연', '도윤'], ['서연', '도윤']),
  ],
  roasters: [
    row('2026-12-15', ['하준'], ['유나']),
    row('2026-12-16', ['하준'], ['유나']),
    row('2026-12-17', ['하준'], ['유나']),
    row('2026-12-18', ['하준'], ['유나']),
    row('2026-12-19', ['하준'], ['유나']),
    row('2026-12-20', ['유나'], ['유나']),
    row('2026-12-21', ['유나'], ['유나']),
  ],
}
export const DRAFT_WEEK_LABEL = '12월 3주차'

function row(date: string, open: string[], close: string[], shortage = 0): DraftRow {
  return { date, open, close, shortage }
}

/** 매뉴얼 추천 템플릿 (docs/03 S2). 같은 제목 매뉴얼이 있으면 빼고 보여 준다 */
export const MANUAL_TEMPLATES: { icon: ManualIcon; title: string; hint: string }[] = [
  { icon: 'wifi', title: '와이파이', hint: '예) 이름 cafe_5G · 비밀번호 1234' },
  { icon: 'restroom', title: '화장실', hint: '예) 건물 2층 왼쪽 · 비밀번호 0000*' },
  { icon: 'open', title: '오픈 순서', hint: '예) 1) 불·음악 켜기 2) 머신 예열 15분' },
  { icon: 'close', title: '마감 순서', hint: '예) 1) 머신 청소 2) 정산 3) 가스·전등 확인' },
  { icon: 'delivery', title: '배달 · 입고', hint: '예) 입고는 화·금 오전' },
  { icon: 'refund', title: '환불', hint: '예) 영수증이 있으면 30분 이내 가능' },
]

/** 레시피 추천 템플릿 (docs/03 S3): 이름 → 카테고리 · 재료 */
export const RECIPE_TEMPLATES: Record<string, { category: string; ingredients: string[] }> = {
  아메리카노: { category: '커피', ingredients: ['에스프레소', '정수', '얼음'] },
  카페라떼: { category: '라떼', ingredients: ['에스프레소', '우유', '얼음'] },
  바닐라라떼: { category: '라떼', ingredients: ['바닐라 시럽', '에스프레소', '우유', '얼음'] },
  에이드: { category: '에이드', ingredients: ['과일 베이스', '탄산수', '얼음'] },
  스무디: { category: '스무디', ingredients: ['냉동 과일', '우유', '얼음'] },
  티: { category: '티', ingredients: ['티백 · 청', '뜨거운 물'] },
}

/** 사장님 레시피 카테고리 (탭 순서) */
export const OWNER_CATEGORIES = ['커피', '라떼', '에이드', '스무디', '티', '디저트']

/** 사진 스캔 AI 초안 (시연): 읽지 못한 칸(amount: null)은 사장님이 채운다 */
export const SCAN_DRAFT = {
  name: '자몽 허니 블랙티',
  category: '티',
  temp: 'ICE' as const,
  size: '16oz',
  ingredients: [
    { name: '자몽청', amount: '2스푼' as string | null },
    { name: '꿀', amount: null as string | null },
    { name: '블랙티', amount: '1팩 · 물 150ml' as string | null },
    { name: '얼음', amount: '컵 가득' as string | null },
  ],
  steps: ['블랙티를 물 150ml에 3분 우려요', '컵에 청 · 꿀 · 얼음을 담아요', '우린 티를 부어요'],
}
