// 날짜 · 시간 · 금액 표시 — 담당: 민지. 화면에서는 이 함수로만 표시해 모양을 통일한다.

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 2026-11-20 → "11/20(금)" */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return `${date.getMonth() + 1}/${date.getDate()}(${WEEKDAYS[date.getDay()]})`
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
