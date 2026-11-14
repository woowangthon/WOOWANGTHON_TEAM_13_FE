import { cn } from '@/ui/utils'

// 알약 세그먼트 탭 (레시피 / 매뉴얼 · 근무표 / 예상 급여 · 세금 방식) — 담당: 나현
export interface TabOption<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  options: TabOption<T>[]
  value: T
  onChange: (value: T) => void
  /** fill: 칸을 똑같이 나눠 꽉 채운다 (세금 방식) */
  fill?: boolean
  className?: string
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  fill,
  className,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'gap-0.5 rounded-full bg-muted p-1',
        fill ? 'grid auto-cols-fr grid-flow-col' : 'flex',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors',
              fill && 'h-11 px-2 text-[15px]',
              active ? 'bg-brand text-white' : 'bg-transparent text-[#6B7068]',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
