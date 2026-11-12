import { useScheduleWorkers } from '@/lib/api/substitute'
import type { ScheduleWorker } from '@/lib/api/types'
import { avatarColors } from '@/pages/owner/components/avatarColors'

// 근무표 사람별 파스텔 색 [바탕, 글자] — 사장님 직원 목록과 같은 4쌍(나현 avatarColors)을 근무표 사람 목록(schedule-workers) 순서로.
// 같은 사람은 달력 블록 · 날짜 목록 · 대타 시트에서 늘 같은 색. 4명이 넘으면 색이 반복되니 늘 이름과 같이 보여 준다

export type PersonColor = readonly [bg: string, fg: string]

/** 목록에 없는 사람(퇴사 등) · 목록을 아직 못 받았을 때 */
const UNKNOWN_COLOR: PersonColor = ['var(--muted)', 'var(--muted-foreground)']

export function personColor(userId: string, workers: ScheduleWorker[] | undefined): PersonColor {
  const index = workers?.findIndex((w) => w.userId === userId) ?? -1
  return index < 0 ? UNKNOWN_COLOR : avatarColors(index)
}

/** 매장 근무표 사람 목록을 불러와 userId → 색 */
export function usePersonColor(storeId: string) {
  const workers = useScheduleWorkers(storeId).data?.workers
  return (userId: string) => personColor(userId, workers)
}
