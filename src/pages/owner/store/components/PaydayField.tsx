import { useEffect, useRef } from 'react'
import { cn } from '@/ui/utils'

// 급여일 휠 (매장 등록 ② · 매장 상세): 매월 1~30일 · 말일(31)
// BE 는 1~31 을 받는다 (31 은 짧은 달에도 마지막 날, 마이그레이션 17)

const PAYDAYS = [...Array.from({ length: 30 }, (_, i) => i + 1), 31]
const ROW = 44

export function PaydayField({
  value,
  onChange,
}: {
  value: number
  onChange: (payday: number) => void
}) {
  const wheel = useRef<HTMLDivElement>(null)
  const initial = useRef(value)

  // 처음 열 때 고른 급여일로 휠을 맞춘다
  useEffect(() => {
    wheel.current?.scrollTo({ top: Math.max(0, PAYDAYS.indexOf(initial.current)) * ROW })
  }, [])

  const onScroll = () => {
    if (!wheel.current) return
    const index = Math.max(
      0,
      Math.min(PAYDAYS.length - 1, Math.round(wheel.current.scrollTop / ROW)),
    )
    if (PAYDAYS[index] !== value) onChange(PAYDAYS[index])
  }

  return (
    <div className="relative overflow-hidden rounded-[22px] bg-card shadow-soft">
      <div className="pointer-events-none absolute inset-x-3 top-11 h-11 rounded-[14px] bg-brand-soft" />
      <div
        ref={wheel}
        onScroll={onScroll}
        role="listbox"
        aria-label="급여일"
        className="no-scrollbar relative h-[132px] snap-y snap-mandatory overflow-y-auto py-11"
      >
        {PAYDAYS.map((day) => {
          const on = day === value
          return (
            <div
              key={day}
              role="option"
              aria-selected={on}
              className={cn(
                'flex h-11 snap-center items-center justify-center',
                on ? 'text-xl font-extrabold text-brand' : 'text-base font-medium text-faint',
              )}
            >
              매월 {day === 31 ? '말일' : `${day}일`}
            </div>
          )
        })}
      </div>
    </div>
  )
}
