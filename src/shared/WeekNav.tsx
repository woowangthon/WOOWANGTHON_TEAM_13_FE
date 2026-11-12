import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { PRESSABLE } from '@/shared/pressable'
import { cn } from '@/ui/utils'

/*
 * 공용 보기 부품: 요일 줄 주 이동 · 사장/알바 홈이 함께 사용 — 담당: 민지
 * 요일 줄(children)과 한 줄에 [‹] 월 화 수 목 금 토 일 [›]. 화살표는 32px 옅은 테두리 동그라미.
 * 이번 주가 아니면 요일 줄 아래 가운데 작은 글자 버튼 [이번 주로] (이번 주면 그 줄 자체가 없다)
 *
 * 사용 예:
 *   <WeekNav thisWeek={offset === 0} onMove={(step) => …} onThisWeek={() => …}>
 *     <div className="grid grid-cols-7 gap-0.5">…요일 버튼…</div>
 *   </WeekNav>
 */
export function WeekNav({
  thisWeek,
  onMove,
  onThisWeek,
  children,
  className,
}: {
  /** 오늘이 있는 주를 보고 있으면 true ([이번 주로] 숨김) */
  thisWeek: boolean
  /** -1 저번 주 · 1 다음 주 */
  onMove: (step: number) => void
  onThisWeek: () => void
  /** 요일 줄 (7칸) */
  children: ReactNode
  className?: string
}) {
  const arrow = cn(
    'flex size-8 shrink-0 items-center justify-center rounded-full border border-line/40 bg-card text-muted-foreground',
    PRESSABLE,
  )
  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div className="flex w-full items-center gap-1">
        <button type="button" aria-label="저번 주" onClick={() => onMove(-1)} className={arrow}>
          <ChevronLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
        <button type="button" aria-label="다음 주" onClick={() => onMove(1)} className={arrow}>
          <ChevronRight className="size-4" />
        </button>
      </div>
      {!thisWeek && (
        <button
          type="button"
          onClick={onThisWeek}
          className="rounded-full px-3 py-1 text-[13px] font-bold text-brand active:bg-secondary"
        >
          이번 주로
        </button>
      )}
    </div>
  )
}
