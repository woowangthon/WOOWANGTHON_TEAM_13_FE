import { ChevronLeft, ChevronRight, Repeat } from 'lucide-react'
import { useState } from 'react'
import { useScheduleCalendar } from '@/lib/api/schedule'
import type { CalendarShift } from '@/lib/api/types'
import { fromDateKey, isSameDay, toDateKey } from '@/lib/date'
import { formatDate } from '@/lib/format'
import { avatarColors } from '@/pages/owner/components/avatarColors'
import { LoadError } from '@/shared/LoadError'
import { Spinner } from '@/ui/Spinner'
import { cn } from '@/ui/utils'

// 근무 달력 (고정 근무 + 대타 반영, BE /schedule-calendar): 한 달 · 사람별로 보기 → 날짜를 누르면 그날 근무
// 하루만 담당자 바꾸기는 BE 가 담당자 본인의 대타 요청만 받아서 이번엔 없다 (팀에 물어볼 것)

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function WorkCalendar({ storeId, today }: { storeId: string; today: Date }) {
  const [offset, setOffset] = useState(0)
  const [person, setPerson] = useState<string>('all')
  const [selected, setSelected] = useState(toDateKey(today))
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0)
  const query = useScheduleCalendar(storeId, toDateKey(first), toDateKey(last))
  const shifts = query.data?.shifts ?? []

  // 사람 칩: 이 달에 근무가 있는 사람 (사장님 먼저)
  const people = [...new Map(shifts.map((s) => [s.assignee.userId, s.assignee])).values()].sort(
    (a, b) => (a.role === b.role ? 0 : a.role === 'owner' ? -1 : 1),
  )
  const colorOf = (userId: string) => {
    const p = people.find((x) => x.userId === userId)
    if (p?.role === 'owner') return 'var(--brand)'
    return avatarColors(
      people.filter((x) => x.role === 'staff').findIndex((x) => x.userId === userId),
    )[1]
  }
  const shown = person === 'all' ? shifts : shifts.filter((s) => s.assignee.userId === person)
  const byDay = (key: string) => shown.filter((s) => s.date === key)

  const lead = first.getDay()
  const cells = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from(
      { length: last.getDate() },
      (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1),
    ),
  ]

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="m-0 text-[15px] font-extrabold">근무 달력</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="이전 달"
            onClick={() => setOffset(offset - 1)}
            className="flex size-8 items-center justify-center rounded-full bg-card"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="w-14 text-center text-sm font-bold">{first.getMonth() + 1}월</span>
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => setOffset(offset + 1)}
            className="flex size-8 items-center justify-center rounded-full bg-card"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {people.length > 0 && (
        <div
          className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1"
          role="radiogroup"
          aria-label="사람"
        >
          {[{ userId: 'all', name: '전체' }, ...people].map((p) => (
            <button
              key={p.userId}
              type="button"
              role="radio"
              aria-checked={person === p.userId}
              onClick={() => setPerson(p.userId)}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold',
                person === p.userId ? 'bg-ink text-white' : 'bg-card text-foreground',
              )}
            >
              {p.userId !== 'all' && (
                <span className="size-2 rounded-full" style={{ background: colorOf(p.userId) }} />
              )}
              {p.name}
            </button>
          ))}
        </div>
      )}

      {query.isPending ? (
        <Spinner />
      ) : query.error ? (
        <LoadError error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <div className="flex flex-col gap-3 rounded-[22px] bg-card p-3 shadow-soft">
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d, i) => (
              <span
                key={d}
                className={cn(
                  'text-center text-[11px] font-bold',
                  i === 0 ? 'text-destructive-foreground' : 'text-muted-foreground',
                )}
              >
                {d}
              </span>
            ))}
            {cells.map((date, i) => {
              if (!date) return <span key={`blank-${i}`} />
              const key = toDateKey(date)
              const dayShifts = byDay(key)
              const on = key === selected
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  aria-label={`${formatDate(date)} 근무 ${dayShifts.length}개`}
                  aria-pressed={on}
                  className={cn(
                    'flex aspect-square flex-col items-center justify-start gap-1 rounded-xl pt-1.5 text-[13px]',
                    on ? 'bg-ink text-white' : 'bg-transparent',
                    isSameDay(date, today) && !on && 'ring-[1.5px] ring-brand',
                  )}
                >
                  <span className="font-bold">{date.getDate()}</span>
                  <span className="flex flex-wrap justify-center gap-0.5 px-0.5">
                    {dayShifts.slice(0, 4).map((s) => (
                      <span
                        key={`${s.assignmentId}-${s.assignee.userId}`}
                        className="size-1.5 rounded-full"
                        style={{ background: on ? '#fff' : colorOf(s.assignee.userId) }}
                      />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
          <DayList date={selected} shifts={byDay(selected)} colorOf={colorOf} />
        </div>
      )}
    </section>
  )
}

function DayList({
  date,
  shifts,
  colorOf,
}: {
  date: string
  shifts: CalendarShift[]
  colorOf: (userId: string) => string
}) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-[#F0EBE2] pt-3">
      <span className="px-1 text-[13px] font-bold text-muted-foreground">
        {formatDate(fromDateKey(date))}
      </span>
      {shifts.length === 0 ? (
        <span className="px-1 py-2 text-sm text-muted-foreground">근무가 없어요</span>
      ) : (
        shifts.map((s) => (
          <div
            key={`${s.assignmentId}-${s.assignee.userId}`}
            className="flex items-center gap-2.5 rounded-[16px] bg-background px-3 py-2.5"
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: colorOf(s.assignee.userId) }}
            />
            <span className="w-[86px] shrink-0 text-[13px] font-semibold text-muted-foreground tabular-nums">
              {s.start}~{s.end}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold">
              {s.name} · {s.assignee.name}
            </span>
            {s.substituted && (
              <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-warm px-2 py-0.5 text-[11px] font-bold text-warm-foreground">
                <Repeat className="size-3" />
                대타
              </span>
            )}
          </div>
        ))
      )}
    </div>
  )
}
