// 날짜 값 변환 — 담당: 민지. API 날짜("2026-11-20") ↔ Date. 화면 표시는 format.ts
import { useSyncExternalStore } from 'react'

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

/** 한국 시간(KST) 오늘 0시 — BE 가 "오늘"을 KST 로 정해서 기기 시간대와 상관없이 맞춘다 */
export function todayInKst() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return new Date(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate())
}

/** 며칠 더하기 (빼려면 음수) */
export function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** 화면이 다시 보일 때(다른 앱 · 탭에서 돌아옴) · 창에 포커스가 올 때 오늘을 다시 계산한다 */
function subscribeToday(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange)
  window.addEventListener('focus', onChange)
  return () => {
    document.removeEventListener('visibilitychange', onChange)
    window.removeEventListener('focus', onChange)
  }
}

/** 한국 시간 오늘 "2026-11-20". 자정이 지난 뒤 화면으로 돌아오면 새 날짜로 바뀐다 (쿼리 키에 넣어 다시 불러오기) */
export function useTodayKey() {
  return useSyncExternalStore(subscribeToday, () => toDateKey(todayInKst()))
}
