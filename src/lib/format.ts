// 날짜 · 시간 · 금액 표시 — 담당: 민지. 화면에서는 이 함수로만 표시해 모양을 통일한다.

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 2026-11-20 → "11/20(금)" */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return `${date.getMonth() + 1}/${date.getDate()}(${WEEKDAYS[date.getDay()]})`
}

/** 알림 시각: 방금 · 3분 전 · 2시간 전 · 어제 · 11/18(수) */
export function formatRelative(value: string | Date, now: Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  if (minutes < 24 * 60 && now.getDate() === date.getDate())
    return `${Math.floor(minutes / 60)}시간 전`
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  )
    return '어제'
  return formatDate(date)
}

/** 2026-11-13 → "11월 13일 (금)" (상세 카드 제목처럼 크게 보여 줄 때) */
export function formatLongDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`
}

/** 근무 시간 합계: 6 → "6시간" · 4.5 → "4.5시간", short 면 "6h" · "4.5h" (소수 첫째 자리까지, ".0" 없이) */
export function formatHours(hours: number, short = false): string {
  const rounded = Math.round(hours * 10) / 10
  return short ? `${rounded}h` : `${rounded}시간`
}

/** Date → "18:00" */
export function formatTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/**
 * 사장님 호칭: BE 는 이름(닉네임)만 준다 ("류민지") → "류민지 사장님". 이미 "사장님"이 붙어 있으면 그대로, 없으면 "사장님"
 */
export function formatOwner(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? ''
  if (!trimmed) return '사장님'
  return trimmed.endsWith('사장님') ? trimmed : `${trimmed} 사장님`
}

/** 681120 → "681,120원" */
export function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}
