import type { ReactNode } from 'react'
import { cn } from '@/ui/utils'

// 한 달 달력 칸 — 담당: 나현. 날짜 칸 모양은 renderDay 로 화면마다 정한다.
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

interface CalendarProps {
  year: number
  /** 1~12 */
  month: number
  renderDay: (day: number) => ReactNode
  className?: string
}

export function Calendar({ year, month, renderDay, className }: CalendarProps) {
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const lastDay = new Date(year, month, 0).getDate()

  return (
    <div className={cn('grid grid-cols-7 gap-1 text-center', className)}>
      {WEEKDAYS.map((weekday) => (
        <span key={weekday} className="pt-0.5 pb-1.5 text-[11px] font-semibold text-faint">
          {weekday}
        </span>
      ))}
      {Array.from({ length: firstWeekday }, (_, i) => (
        <span key={`blank-${i}`} />
      ))}
      {Array.from({ length: lastDay }, (_, i) => (
        <div key={i + 1} className="flex justify-center">
          {renderDay(i + 1)}
        </div>
      ))}
    </div>
  )
}
