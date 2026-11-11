import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { shiftHours, shiftKey, useScheduleCalendar } from '@/lib/api/schedule'
import type { CalendarShift } from '@/lib/api/types'
import { addDays, isSameDay, toDateKey } from '@/lib/date'
import { formatDate } from '@/lib/format'
import { HOLIDAYS, isClosedDay } from '@/pages/owner/store/holidays'
import { LoadError } from '@/shared/LoadError'
import { Spinner } from '@/ui/Spinner'
import { cn } from '@/ui/utils'

// 근무 달력 (고정 근무 + 대타 반영, BE /schedule-calendar) — 알바 근무표(민지 ScheduleMonth)와 같은 모양
// 날짜 칸 안에 그날 근무를 작은 블록(시작 시간 · 이름)으로. 사장님 근무(내 근무)는 진한 매장 색, 대타는 점선 테두리.
// 날짜를 누르면 아래에 그날 근무 카드. ‹ › 로 달 이동, 한 번에 6주(≤ BE 63일)를 불러온다
// 사람 칩으로 한 사람만 보기 · 매장 쉬는 날(쉬는 요일 · 공휴일 휴무)은 "휴무" (근무 블록 숨김) · 공휴일은 빨간 날짜
// 사장님이 그날만 조정한 근무(BE #38, assignmentId null · dailyShiftId)는 쉬는 날에도 보이고 "조정" 표시
// 하루만 담당자 바꾸기는 BE 가 담당자 본인의 대타 요청만 받아서 이번엔 없다 (팀에 물어볼 것)

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
/** 칸 안에 보여 줄 블록 수 (넘으면 +N) */
const MAX_BLOCKS = 3
/** 4글자 이상 이름은 한 단계 작게 */
const LONG_NAME = 4

/** 그 달을 덮는 달력 칸: 1일이 있는 주의 일요일 ~ 말일이 있는 주의 토요일 */
function monthGrid(year: number, month: number) {
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const start = addDays(first, -first.getDay())
  const end = addDays(last, 6 - last.getDay())
  const days: Date[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
  return { start, end, days }
}

const hourText = (time: string) => String(Number(time.slice(0, 2)))
/** 칸이 좁아서 사장님은 "사장"으로만 (아래 카드에는 이름 그대로) */
const blockName = (shift: CalendarShift) =>
  shift.assignee.role === 'owner' ? '사장' : shift.assignee.name.trim()
/** 쉬는 날에는 사장님이 그날만 넣은 근무만 보인다 (BE 도 휴무일 고정 근무는 빼고 조정 근무는 준다) */
const shownOn = (closedDay: boolean, shifts: CalendarShift[]) =>
  closedDay ? shifts.filter((s) => s.manuallyAdjusted) : shifts

/** 사장님 화면이라 '내 근무' = 사장님 근무 */
const isMine = (shift: CalendarShift) => shift.assignee.role === 'owner'

export function WorkCalendar({
  storeId,
  today,
  closed,
}: {
  storeId: string
  today: Date
  /** 매장 쉬는 날 (매장 상세) */
  closed: { closedWeekdays: number[]; closedOnHolidays: boolean }
}) {
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 })
  const [selected, setSelected] = useState<Date>(today)
  const [person, setPerson] = useState('all')
  const { start, end, days } = monthGrid(view.year, view.month)
  const query = useScheduleCalendar(storeId, toDateKey(start), toDateKey(end))

  const move = (step: number) => {
    const next = new Date(view.year, view.month - 1 + step, 1)
    setView({ year: next.getFullYear(), month: next.getMonth() + 1 })
    // 이번 달로 오면 오늘, 아니면 1일을 고른다
    setSelected(
      next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth()
        ? today
        : next,
    )
  }

  const all = query.data?.shifts ?? []
  // 사람 칩: 이 기간에 근무가 있는 사람 (사장님 먼저)
  const people = [...new Map(all.map((s) => [s.assignee.userId, s.assignee])).values()].sort(
    (a, b) => (a.role === b.role ? 0 : a.role === 'owner' ? -1 : 1),
  )
  const byDate = new Map<string, CalendarShift[]>()
  for (const shift of all) {
    if (person !== 'all' && shift.assignee.userId !== person) continue
    byDate.set(shift.date, [...(byDate.get(shift.date) ?? []), shift])
  }
  const selectedKey = toDateKey(selected)
  const selectedClosed = isClosedDay(selected, selectedKey, closed)
  const selectedShifts = shownOn(selectedClosed, byDate.get(selectedKey) ?? [])

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="m-0 text-[15px] font-extrabold">근무 달력</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="지난달"
            onClick={() => move(-1)}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-card"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="min-w-[96px] text-center text-[15px] font-bold tabular-nums">
            {view.year}년 {view.month}월
          </span>
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => move(1)}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-card"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {people.length > 0 && (
        <div
          className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1"
          role="radiogroup"
          aria-label="사람"
        >
          {[{ userId: 'all', name: '전체', role: 'staff' as const }, ...people].map((p) => (
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
                <span
                  className={cn(
                    'size-2 rounded-full',
                    p.role === 'owner' ? 'bg-brand' : 'bg-brand-soft ring-1 ring-line',
                  )}
                />
              )}
              {p.name}
            </button>
          ))}
        </div>
      )}

      {query.isPending ? (
        <Spinner />
      ) : query.error ? (
        <LoadError what="근무 달력을" error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <div className="flex flex-col gap-2 rounded-[24px] bg-card px-2 pt-3 pb-2 shadow-soft">
            <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-muted-foreground">
              {WEEKDAYS.map((w, i) => (
                <span key={w} className={cn(i === 0 && 'text-[#C0574A]')}>
                  {w}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const key = toDateKey(day)
                const dayClosed = isClosedDay(day, key, closed)
                const holiday = HOLIDAYS[key]
                const shifts = shownOn(dayClosed, byDate.get(key) ?? [])
                const inMonth = day.getMonth() === view.month - 1
                const isToday = isSameDay(day, today)
                const isSelected = isSameDay(day, selected)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(day)}
                    aria-pressed={isSelected}
                    aria-label={`${formatDate(day)}${holiday ? ` ${holiday}` : ''}${dayClosed ? ' 휴무' : ''} 근무 ${shifts.length}개`}
                    className={cn(
                      'flex min-h-[78px] min-w-0 flex-col gap-[3px] border-t border-[#F0EBE2] px-[2px] pt-1 pb-1.5 text-left transition-colors duration-150',
                      !inMonth && 'opacity-40',
                      isSelected && 'rounded-[10px] bg-background',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-[22px] items-center justify-center self-center rounded-full text-xs tabular-nums',
                        isToday ? 'bg-brand font-bold text-white' : 'font-semibold',
                        !isToday && (holiday || day.getDay() === 0) && 'text-[#C0574A]',
                      )}
                    >
                      {day.getDate()}
                    </span>
                    {dayClosed && (
                      <span className="rounded-[5px] bg-muted px-[2px] py-px text-center text-[10px] leading-[1.3] font-semibold text-muted-foreground">
                        휴무
                      </span>
                    )}
                    {shifts.slice(0, MAX_BLOCKS).map((shift) => {
                      const name = blockName(shift)
                      return (
                        <span
                          key={shiftKey(shift)}
                          className={cn(
                            'flex min-w-0 flex-wrap items-baseline gap-x-[3px] rounded-[5px] px-[2px] py-px text-[10px] leading-[1.3] font-semibold',
                            isMine(shift) ? 'bg-brand text-white' : 'bg-brand-soft text-foreground',
                            shift.substituted &&
                              'outline-1 -outline-offset-1 outline-current outline-dashed',
                          )}
                        >
                          <span className="shrink-0 tabular-nums">{hourText(shift.start)}</span>
                          <span
                            className={cn(
                              'max-w-full min-w-0 truncate',
                              name.length >= LONG_NAME && 'text-[9px] tracking-[-0.02em]',
                            )}
                          >
                            {name}
                          </span>
                        </span>
                      )
                    })}
                    {shifts.length > MAX_BLOCKS && (
                      <span className="px-[3px] text-[10px] font-semibold text-muted-foreground">
                        +{shifts.length - MAX_BLOCKS}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1.5 pt-0.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-[3px] bg-brand" />내 근무
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-[3px] bg-brand-soft" />
                다른 사람
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-[3px] outline-1 -outline-offset-1 outline-muted-foreground outline-dashed" />
                대타
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-[3px] bg-muted" />
                휴무
              </span>
            </div>
          </div>

          <h3 className="m-0 mt-1.5 px-1 text-lg font-extrabold tracking-[-0.02em]">
            {formatDate(selected)} 근무
            {HOLIDAYS[selectedKey] && (
              <span className="ml-2 text-sm font-bold text-[#C0574A]">{HOLIDAYS[selectedKey]}</span>
            )}
          </h3>
          {selectedShifts.length === 0 ? (
            <p className="m-0 rounded-[20px] bg-card px-4 py-4 text-sm text-muted-foreground">
              {selectedClosed ? '매장이 쉬는 날이에요' : '이날은 근무가 없어요'}
            </p>
          ) : (
            selectedShifts.map((shift) => {
              const mine = isMine(shift)
              return (
                <div
                  key={shiftKey(shift)}
                  className={cn(
                    'flex items-center gap-3 rounded-[20px] px-4 py-3.5',
                    mine ? 'texture bg-brand text-white' : 'bg-card shadow-soft',
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="text-base font-extrabold">{shift.assignee.name}</span>
                      {mine && (
                        <span className="rounded-full bg-white/20 px-2 py-px text-[11px] font-bold">
                          나
                        </span>
                      )}
                      {shift.substituted && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-px text-[11px] font-bold',
                            mine ? 'bg-white text-brand' : 'bg-warm text-warm-foreground',
                          )}
                        >
                          대타
                        </span>
                      )}
                      {shift.manuallyAdjusted && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-px text-[11px] font-bold',
                            mine ? 'bg-white text-brand' : 'bg-accent text-accent-foreground',
                          )}
                        >
                          조정
                        </span>
                      )}
                    </span>
                    <span
                      className={cn('text-[13px]', mine ? 'opacity-80' : 'text-muted-foreground')}
                    >
                      {[shift.name, shift.role].filter((t) => t.trim()).join(' · ') || '근무'}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-[15px] font-bold tabular-nums">
                      {shift.start} – {shift.end}
                    </span>
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        mine ? 'opacity-80' : 'text-muted-foreground',
                      )}
                    >
                      {shiftHours(shift)}시간
                    </span>
                  </span>
                </div>
              )
            })
          )}
        </>
      )}
    </section>
  )
}
