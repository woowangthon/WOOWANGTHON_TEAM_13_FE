// 가짜 데이터: 매뉴얼 — BE 연결 전까지 사용

export type ManualIcon = 'wifi' | 'restroom' | 'open' | 'close' | 'refund' | 'milk' | 'umbrella'

export interface Manual {
  id: string
  storeId: string
  icon: ManualIcon
  title: string
  body: string
  isNew?: boolean
  /** 가짜 AI 답변용: 이 단어가 질문에 있으면 이 매뉴얼로 답한다 */
  keywords: string[]
  answer: string
}

export const manuals: Manual[] = [
  {
    id: 'wifi',
    storeId: 'dalbit',
    icon: 'wifi',
    title: '와이파이',
    body: 'dalbit_5G · 비밀번호 moon2026',
    keywords: ['와이파이', 'wifi'],
    answer: '와이파이는 dalbit_5G, 비밀번호는 moon2026이에요.',
  },
  {
    id: 'rest',
    storeId: 'dalbit',
    icon: 'restroom',
    title: '화장실',
    body: '건물 2층 왼쪽, 비밀번호 0915*',
    keywords: ['화장실', '비번'],
    answer: '화장실은 건물 2층 왼쪽이고, 비밀번호는 0915*예요.',
  },
  {
    id: 'open',
    storeId: 'dalbit',
    icon: 'open',
    title: '오픈 순서',
    body: '1) 불·음악 켜기 2) 머신 예열 15분 3) 우유·청 유통기한 확인 4) 쇼케이스 채우기',
    keywords: ['오픈'],
    answer: '불과 음악을 켜고 → 머신 예열 15분 → 우유·청 유통기한 확인 → 쇼케이스 채우기 순서예요.',
  },
  {
    id: 'close',
    storeId: 'dalbit',
    icon: 'close',
    title: '마감 순서',
    body: '1) 머신 백플러시 2) 스팀봉 닦기 3) 바닥 청소 4) 정산 후 금고 5) 가스·전등 확인',
    keywords: ['마감'],
    answer:
      '머신 백플러시 → 스팀봉 닦기 → 바닥 청소 → 정산 후 금고 → 마지막으로 가스와 전등 확인이에요.',
  },
  {
    id: 'refund',
    storeId: 'dalbit',
    icon: 'refund',
    title: '환불',
    body: '영수증이 있으면 30분 이내 가능. 음료 문제는 1회 다시 만들어 드려요.',
    keywords: ['환불', '이상하'],
    answer: '환불은 영수증이 있으면 30분 이내 가능하고, 음료 문제면 1회 다시 만들어 드려요.',
  },
  {
    id: 'milk',
    storeId: 'dalbit',
    icon: 'milk',
    title: '우유 진열',
    body: '유통기한 짧은 것부터 앞으로 놓아요.',
    keywords: ['우유 진열', '유통기한'],
    answer: '우유는 유통기한 짧은 것부터 앞으로 놓아요.',
  },
  {
    id: 'a_wifi',
    storeId: 'afternoon',
    icon: 'wifi',
    title: '와이파이',
    body: 'afternoon_guest · 비밀번호 coffee1400',
    keywords: ['와이파이', 'wifi'],
    answer: '와이파이는 afternoon_guest, 비밀번호는 coffee1400이에요.',
  },
  {
    id: 'a_rest',
    storeId: 'afternoon',
    icon: 'restroom',
    title: '화장실',
    body: '매장 안쪽 문, 비밀번호 없음',
    keywords: ['화장실', '비번'],
    answer: '화장실은 매장 안쪽 문이고 비밀번호는 없어요.',
  },
  {
    id: 'a_refund',
    storeId: 'afternoon',
    icon: 'refund',
    title: '환불',
    body: '제조 전에만 환불 가능. 이후에는 사장님께 연락.',
    keywords: ['환불', '이상하'],
    answer: '제조 전에만 환불할 수 있어요. 이미 만들었다면 사장님께 연락해 주세요.',
  },
]

/** 사장님이 채팅으로 답한 뒤 매뉴얼에 추가되는 카드 (시연 흐름) */
export const umbrellaManual: Manual = {
  id: 'umb',
  storeId: 'dalbit',
  icon: 'umbrella',
  title: '우산 대여',
  body: '창고 우산을 빌려드리고 연락처를 받아 둬요.',
  isNew: true,
  keywords: ['우산'],
  answer: '창고 우산을 빌려드리고 연락처를 받아 두면 돼요.',
}

export function storeManuals(storeId: string, umbrellaAdded: boolean) {
  const list = manuals.filter((manual) => manual.storeId === storeId)
  return storeId === 'dalbit' && umbrellaAdded ? [umbrellaManual, ...list] : list
}
