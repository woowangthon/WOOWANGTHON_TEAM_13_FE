// 가짜 데이터: 인수인계 (AI 요약 포함) — BE 연결 전까지 사용

export type HandoverTag = '외상' | '재고' | '기타'

export interface HandoverItem {
  id: string
  tag: HandoverTag
  text: string
}

export interface HandoverDay {
  /** 작성자 · 시간 */
  from: string
  summary: string
  items: HandoverItem[]
}

/** 매장별 · 날짜(일)별 인수인계. 오늘 것은 체크할 수 있다 */
export const handoverDays: Record<string, Record<number, HandoverDay>> = {
  dalbit: {
    16: {
      from: '지은 · 23:10',
      summary: '우유 2팩 남음 · 정산 이상 없음',
      items: [
        { id: 'd16a', tag: '재고', text: '우유 2팩 남음' },
        { id: 'd16b', tag: '기타', text: '마감 정산 이상 없음' },
      ],
    },
    17: {
      from: '도윤 · 23:05',
      summary: '그라인더 소음 · 바닐라 시럽 주문 완료',
      items: [
        { id: 'd17a', tag: '기타', text: '그라인더 소음 · 사장님께 전달됨' },
        { id: 'd17b', tag: '재고', text: '바닐라 시럽 주문 완료' },
      ],
    },
    18: { from: '지은 · 23:00', summary: '', items: [] },
    19: {
      from: '민수 · 22:55',
      summary: '꽃집 외상 1잔 · 내일 계산',
      items: [
        { id: 'd19a', tag: '외상', text: '꽃집 사장님 아이스 아메리카노 1잔 · 내일 계산' },
        { id: 'd19b', tag: '재고', text: '딸기청 2병 남음' },
      ],
    },
    20: {
      from: '민수 · 14:50',
      summary: '꽃집 외상 오늘 계산 · 딸기청 1병 남음',
      items: [
        { id: 'h1', tag: '외상', text: '꽃집 사장님 아이스 아메리카노 1잔 · 오늘 계산' },
        { id: 'h2', tag: '재고', text: '딸기청 1병 남음' },
        { id: 'h3', tag: '기타', text: '제빙기 소음 · 사장님께 전달됨' },
      ],
    },
  },
  afternoon: {
    17: {
      from: '최 사장님 · 18:00',
      summary: '제빙기 필터 교체',
      items: [{ id: 'a17a', tag: '기타', text: '제빙기 필터 교체함' }],
    },
    20: {
      from: '서진 · 18:10',
      summary: '흑당 시럽 1통 남음',
      items: [{ id: 'a20a', tag: '재고', text: '흑당 시럽 1통 남음' }],
    },
    21: { from: '서진 · 11:50', summary: '', items: [] },
  },
}

/** 가짜 AI 요약: 문장마다 태그를 붙인다 (BE 연결 후 AI 요약 API 로 바꾼다) */
export function mockSummarize(note: string): HandoverItem[] {
  return note
    .split(/[.\n!?]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((text, i) => ({
      id: `new-${Date.now()}-${i}`,
      text,
      tag: /외상|계산|나중에/.test(text)
        ? '외상'
        : /남았|남음|떨어|재고|부족|개 남/.test(text)
          ? '재고'
          : '기타',
    }))
}
