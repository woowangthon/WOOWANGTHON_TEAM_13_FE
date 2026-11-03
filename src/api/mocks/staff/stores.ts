// 가짜 데이터: 알바생 소속 매장 (n잡 2곳) — BE 연결 전까지 사용

export type StoreIcon = 'moon' | 'sunset'

export interface StaffStore {
  id: string
  code: string
  name: string
  kind: string
  address: string
  ownerName: string
  icon: StoreIcon
  /** 매장 색 (--brand) */
  color: string
  /** 매장 연한 색 (--brand-soft) */
  soft: string
  /** 홈 사진 위 어둡게 덮는 그라데이션 */
  scrim: string
  /** 홈 상단 사진 (public/ 아래). 없으면 매장 색으로 보인다 */
  photo?: string
  /** 매장 목록에 보이는 한 줄 */
  meta: string
  /** 시연 기준 오늘 */
  today: Date
  shift: { start: string; end: string; role: string }
  crew: string
  /** 이번 주 (월~일) 근무 여부 */
  week: { date: Date; work: boolean }[]
  weekHours: number
  weekNote: string
  chips: string[]
}

const d = (month: number, day: number) => new Date(2026, month - 1, day)

const week = (startDay: number, workDays: number[]) =>
  Array.from({ length: 7 }, (_, i) => ({
    date: d(11, startDay + i),
    work: workDays.includes(startDay + i),
  }))

export const staffStores: StaffStore[] = [
  {
    id: 'dalbit',
    code: 'K7P2QX',
    name: '달빛 카페',
    kind: '카페',
    address: '서울 마포구 와우산로21길 8',
    ownerName: '박 사장님',
    icon: 'moon',
    color: '#2A4536',
    soft: '#E3E8DC',
    scrim: 'linear-gradient(180deg, rgba(24,36,29,0.15) 0%, rgba(24,36,29,0.85) 78%)',
    photo: '/images/cafe-dalbit.jpg',
    meta: '주 3회 마감 · 박 사장님',
    today: d(11, 20),
    shift: { start: '18:00', end: '23:00', role: '마감' },
    crew: '도윤 · 민수',
    week: week(16, [16, 18, 20]),
    weekHours: 10,
    weekNote: '오늘 마감 후 15시간 · 주휴수당 대상',
    chips: ['화장실 비번', '마감 순서', '환불', '손님이 우산 빌려 달래'],
  },
  {
    id: 'afternoon',
    code: 'A1B2C3',
    name: '오후의 커피',
    kind: '브런치 카페',
    address: '서울 성동구 서울숲2길 32',
    ownerName: '최 사장님',
    icon: 'sunset',
    color: '#6E3B26',
    soft: '#F3E3D6',
    scrim: 'linear-gradient(180deg, rgba(60,32,20,0.15) 0%, rgba(60,32,20,0.85) 78%)',
    photo: '/images/cafe-afternoon.jpg',
    meta: '주말 오후 · 최 사장님',
    today: d(11, 21),
    shift: { start: '12:00', end: '18:00', role: '오후' },
    crew: '최 사장님',
    week: week(16, [21, 22]),
    weekHours: 6,
    weekNote: '주휴수당 대상 아님',
    chips: ['화장실', '환불', '아메리카노 샷'],
  },
]

export const DEFAULT_STORE_ID = 'dalbit'

export function findStaffStore(storeId: string | null | undefined): StaffStore {
  return staffStores.find((store) => store.id === storeId) ?? staffStores[0]
}

/** "18:00" – "23:00" → 5 */
export function shiftHours(store: StaffStore): number {
  const [start, end] = [store.shift.start, store.shift.end].map((t) => parseInt(t, 10))
  return end - start
}

export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
