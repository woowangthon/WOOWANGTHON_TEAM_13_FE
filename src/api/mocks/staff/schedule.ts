// 가짜 데이터: 근무표 · 근무 가능 시간 — BE 연결 전까지 사용

export interface MyShift {
  date: Date
  time: string
  /** 역할 · 함께 일하는 사람 */
  role: string
}

const d = (month: number, day: number) => new Date(2026, month - 1, day)

export const myShifts: Record<string, MyShift[]> = {
  dalbit: [
    { date: d(11, 16), time: '18:00 – 23:00', role: '마감 · 지은 · 도윤' },
    { date: d(11, 18), time: '18:00 – 23:00', role: '마감 · 지은 · 도윤' },
    { date: d(11, 20), time: '18:00 – 23:00', role: '마감 · 지은 · 민수' },
  ],
  afternoon: [
    { date: d(11, 21), time: '12:00 – 18:00', role: '오후 · 지은' },
    { date: d(11, 22), time: '12:00 – 18:00', role: '오후 · 지은' },
  ],
}

/** 가능 시간을 받는 달과 마감일 */
export const availabilityMonth = { year: 2026, month: 12, deadline: d(11, 25) }

/** 0 비움 · 1 가능 · 2 불가 */
export type AvailabilityMark = 0 | 1 | 2

export const initialAvailability: Record<number, AvailabilityMark> = {
  15: 2,
  16: 2,
  17: 2,
  18: 2,
  19: 2,
}

export const initialAvailabilityMemo = '15~19일 기말고사 · 주 3회 마감 희망'
