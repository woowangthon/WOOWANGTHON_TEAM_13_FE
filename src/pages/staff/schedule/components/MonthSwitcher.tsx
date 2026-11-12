import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { PRESSABLE } from '@/shared/pressable'
import { cn } from '@/ui/utils'

// 근무 탭 공용: 달 이동 줄 (근무표 · 예상 급여). 왼쪽 섹션 제목 "2026년 11월"(19px · 700) + 오른쪽 ‹ › (docs/08 2 · SectionHeader 와 같은 줄 모양)
// 그 아래 보조 한 줄(예: "이번 주 20시간 · 주휴수당 대상 · 내 근무 기준")은 children 으로
export function MonthSwitcher({
  year,
  month,
  onMove,
  children,
}: {
  year: number
  month: number
  /** -1 지난달 · 1 다음 달 */
  onMove: (step: number) => void
  children?: ReactNode
}) {
  const arrow = cn(
    'flex size-9 items-center justify-center rounded-full border border-line/60 bg-card text-foreground',
    PRESSABLE,
  )
  return (
    <div className="flex flex-col gap-1 px-1">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h2 className="m-0 text-[19px] leading-[1.3] font-bold tracking-[-0.02em] tabular-nums">
          {year}년 {month}월
        </h2>
        <span className="flex items-center gap-2">
          <button type="button" aria-label="지난달" onClick={() => onMove(-1)} className={arrow}>
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" aria-label="다음 달" onClick={() => onMove(1)} className={arrow}>
            <ChevronRight className="size-5" />
          </button>
        </span>
      </div>
      {children}
    </div>
  )
}
