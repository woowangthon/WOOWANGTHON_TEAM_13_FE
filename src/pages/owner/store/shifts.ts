import type { ShiftTemplateInput } from '@/pages/owner/api/types'

// 근무 타임 기본값 · 요일 이름 (매장 등록 · 매장 추가 · 근무 칸에서 같이 쓴다)

/** 처음 채워 두는 근무 타임 (사장님이 이름 · 시간 · 인원을 고치고 빼거나 더할 수 있다) */
export const DEFAULT_SHIFT_TEMPLATES: ShiftTemplateInput[] = [
  { name: '오픈', start: '09:00', end: '14:00', headcount: 1 },
  { name: '미들', start: '12:00', end: '18:00', headcount: 1 },
  { name: '마감', start: '17:00', end: '22:00', headcount: 1 },
]

/** 0=월 ~ 6=일 (BE weekday 와 같은 순서) */
export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

export const MAX_HEADCOUNT = 10

/** 요일 × 근무 타임 칸 하나 (WeekShiftGrid 의 value) */
export const cellKey = (rowKey: string, weekday: number) => `${rowKey}:${weekday}`

/** 근무 타임 목록이 저장할 수 있는 모양인지 — 안 되면 안내 문구 */
export function shiftTemplatesError(templates: ShiftTemplateInput[]): string | null {
  if (templates.length === 0) return '근무 타임을 하나 이상 만들어 주세요'
  const names = templates.map((t) => t.name.trim())
  if (names.some((n) => !n)) return '근무 타임 이름을 입력해 주세요'
  if (new Set(names).size !== names.length) return '근무 타임 이름이 겹쳐요'
  if (templates.some((t) => !t.start || !t.end || t.start === t.end)) {
    return '시작과 끝 시간을 다르게 정해 주세요'
  }
  return null
}
