import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PRESSABLE } from '@/shared/pressable'
import { cn } from '@/ui/utils'

/*
 * 공용 보기 부품: 요일 줄 위 오른쪽 주 이동 ‹ › · 사장/알바 홈이 함께 사용 — 담당: 민지
 * 모양은 근무 탭 달 이동(MonthSwitcher)의 ‹ › 와 같은 36px 옅은 테두리 알약. 이번 주가 아니면 왼쪽에 작은 [이번 주로]
 *
 * 사용 예:
 *   <WeekNav thisWeek={offset === 0} onMove={(step) => …} onThisWeek={() => …} />
 */
export function WeekNav({
  thisWeek,
  onMove,
  onThisWeek,
  className,
}: {
  /** 오늘이 있는 주를 보고 있으면 true ([이번 주로] 숨김) */
  thisWeek: boolean
  /** -1 저번 주 · 1 다음 주 */
  onMove: (step: number) => void
  onThisWeek: () => void
  className?: string
}) {
  const arrow = cn(
    'flex size-9 items-center justify-center rounded-full border border-line/60 bg-card text-foreground',
    PRESSABLE,
  )
  return (
    <div className={cn('flex items-center justify-end gap-2', className)}>
      {!thisWeek && (
        <button
          type="button"
          onClick={onThisWeek}
          className={cn(
            'flex h-9 items-center rounded-full bg-secondary px-3 text-[13px] font-bold text-foreground',
            PRESSABLE,
          )}
        >
          이번 주로
        </button>
      )}
      <button type="button" aria-label="저번 주" onClick={() => onMove(-1)} className={arrow}>
        <ChevronLeft className="size-5" />
      </button>
      <button type="button" aria-label="다음 주" onClick={() => onMove(1)} className={arrow}>
        <ChevronRight className="size-5" />
      </button>
    </div>
  )
}
