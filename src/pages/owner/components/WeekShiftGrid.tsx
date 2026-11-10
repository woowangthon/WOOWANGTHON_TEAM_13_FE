import { X } from 'lucide-react'
import { cellKey, WEEKDAY_LABELS } from '@/pages/owner/store/shifts'
import { cn } from '@/ui/utils'

// 요일 × 근무 타임 칸 (사장님 근무 · 직원 근무): 칸을 눌러 켜고 끈다. 같은 요일에 여러 타임도 된다
// value 는 cellKey(row.key, weekday) 모음. 쉬는 요일 열은 X 로 막는다

export function WeekShiftGrid({
  rows,
  value,
  onChange,
  closedWeekdays = [],
}: {
  rows: { key: string; label: string; sub?: string }[]
  value: Set<string>
  onChange: (value: Set<string>) => void
  closedWeekdays?: number[]
}) {
  const toggle = (key: string) => {
    const next = new Set(value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange(next)
  }

  return (
    <div
      className="grid gap-1.5 rounded-[22px] bg-card p-3"
      style={{ gridTemplateColumns: 'minmax(56px, auto) repeat(7, minmax(0, 1fr))' }}
      role="group"
      aria-label="요일별 근무"
    >
      <span />
      {WEEKDAY_LABELS.map((day, i) => (
        <span
          key={day}
          className={cn(
            'text-center text-xs font-bold',
            i >= 5 ? 'text-destructive-foreground' : 'text-muted-foreground',
          )}
        >
          {day}
        </span>
      ))}
      {rows.map((row) => (
        <Row key={row.key} row={row} value={value} closed={closedWeekdays} onToggle={toggle} />
      ))}
    </div>
  )
}

function Row({
  row,
  value,
  closed,
  onToggle,
}: {
  row: { key: string; label: string; sub?: string }
  value: Set<string>
  closed: number[]
  onToggle: (key: string) => void
}) {
  return (
    <>
      <span className="flex min-w-0 flex-col justify-center pr-1">
        <span className="truncate text-[13px] font-bold">{row.label}</span>
        {row.sub && <span className="truncate text-[10px] text-subtle">{row.sub}</span>}
      </span>
      {WEEKDAY_LABELS.map((day, weekday) => {
        const key = cellKey(row.key, weekday)
        if (closed.includes(weekday)) {
          return (
            <span
              key={key}
              aria-label={`${day}요일 휴무`}
              className="flex aspect-square items-center justify-center rounded-xl bg-muted text-faint"
            >
              <X className="size-3.5" />
            </span>
          )
        }
        const on = value.has(key)
        return (
          <button
            key={key}
            type="button"
            role="checkbox"
            aria-checked={on}
            aria-label={`${day}요일 ${row.label}`}
            onClick={() => onToggle(key)}
            className={cn(
              'aspect-square rounded-xl border-[1.5px] transition-colors',
              on ? 'border-brand bg-brand' : 'border-line bg-white',
            )}
          />
        )
      })}
    </>
  )
}
