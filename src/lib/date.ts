// 날짜 값 변환 — 담당: 민지. API 날짜("2026-11-20") ↔ Date. 화면 표시는 format.ts

const pad = (n: number) => String(n).padStart(2, '0')

/** Date → "2026-11-20" (그 지역 날짜 기준) */
export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "2026-11-20" → 그 지역 0시 Date (new Date("2026-11-20")는 UTC 로 읽혀서 쓰지 않는다) */
export function fromDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
