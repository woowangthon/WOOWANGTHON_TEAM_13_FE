import { Check } from 'lucide-react'
import { WEEKDAY_LABELS } from '@/pages/owner/store/shifts'
import { cn } from '@/ui/utils'

// 쉬는 날: 쉬는 요일(여러 개, 0=월 ~ 6=일) + 공휴일에 쉬는지 — 매장 등록 ③ · 매장 상세에서 같이 쓴다

export function ClosedDaysField({
  closedWeekdays,
  onClosedWeekdaysChange,
  closedOnHolidays,
  onClosedOnHolidaysChange,
}: {
  closedWeekdays: number[]
  onClosedWeekdaysChange: (days: number[]) => void
  closedOnHolidays: boolean
  onClosedOnHolidaysChange: (closed: boolean) => void
}) {
  const toggleDay = (day: number) =>
    onClosedWeekdaysChange(
      closedWeekdays.includes(day)
        ? closedWeekdays.filter((d) => d !== day)
        : [...closedWeekdays, day].sort(),
    )

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="쉬는 요일">
        {WEEKDAY_LABELS.map((day, i) => {
          const on = closedWeekdays.includes(i)
          return (
            <button
              key={day}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-label={`${day}요일`}
              onClick={() => toggleDay(i)}
              className={cn(
                'h-11 rounded-[14px] text-sm font-bold',
                on ? 'bg-ink text-white' : 'bg-card text-foreground',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        role="checkbox"
        aria-checked={closedOnHolidays}
        onClick={() => onClosedOnHolidaysChange(!closedOnHolidays)}
        className="flex items-center gap-2.5 px-1 py-1 text-left text-[15px] font-semibold"
      >
        <span
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-lg border-[1.5px]',
            closedOnHolidays ? 'border-brand bg-brand text-white' : 'border-line bg-white',
          )}
        >
          {closedOnHolidays && <Check className="size-4" />}
        </span>
        공휴일에는 쉬어요
      </button>
    </div>
  )
}
