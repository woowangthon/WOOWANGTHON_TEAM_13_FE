import { useEffect, useRef } from 'react'
import { cn } from '@/ui/utils'

// 스크롤 휠 고르기 — 담당: 나현. 위아래로 밀면 가운데 칸이 골라진다 (매장 상세 급여일 휠과 같은 모양)

const ROW = 44

export function WheelPicker<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  /** 스크린 리더용 이름 */
  label: string
  className?: string
}) {
  const wheel = useRef<HTMLDivElement>(null)
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )

  // 처음 열 때 지금 값으로 휠을 맞춘다
  useEffect(() => {
    wheel.current?.scrollTo({ top: index * ROW })
    // 열 때 한 번만 맞춘다 (스크롤로 바꾼 값을 다시 맞추면 휠이 튄다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onScroll = () => {
    if (!wheel.current) return
    const next = Math.max(
      0,
      Math.min(options.length - 1, Math.round(wheel.current.scrollTop / ROW)),
    )
    if (options[next].value !== value) onChange(options[next].value)
  }

  return (
    <div className={cn('relative overflow-hidden rounded-[22px] bg-card', className)}>
      <div className="pointer-events-none absolute inset-x-2 top-11 h-11 rounded-[14px] bg-brand-soft" />
      <div
        ref={wheel}
        onScroll={onScroll}
        role="listbox"
        aria-label={label}
        className="no-scrollbar relative h-[132px] snap-y snap-mandatory overflow-y-auto py-11"
      >
        {options.map((o) => {
          const on = o.value === value
          return (
            <div
              key={o.value}
              role="option"
              aria-selected={on}
              onClick={() =>
                wheel.current?.scrollTo({ top: options.indexOf(o) * ROW, behavior: 'smooth' })
              }
              className={cn(
                'flex h-11 snap-center items-center justify-center tabular-nums',
                on ? 'text-xl font-extrabold text-brand' : 'text-base font-medium text-faint',
              )}
            >
              {o.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
