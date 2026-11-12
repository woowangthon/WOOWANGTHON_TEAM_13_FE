import { ArrowLeftRight, ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  myUserId,
  scheduleToday,
  shiftHours,
  shiftKey,
  toMySchedule,
  useScheduleCalendar,
} from '@/lib/api/schedule'
import type { CalendarShift } from '@/lib/api/types'
import { useSubstituteRequests } from '@/lib/api/substitute'
import { addDays, fromDateKey, isSameDay, toDateKey } from '@/lib/date'
import { formatDate } from '@/lib/format'
import { MonthSwitcher } from '@/pages/staff/schedule/components/MonthSwitcher'
import { SentSubstitutesOfDay } from '@/pages/staff/schedule/components/SubstituteRequests'
import { SubstituteSheet } from '@/pages/staff/schedule/components/SubstituteSheet'
import { PersonInitial } from '@/pages/staff/schedule/components/PersonInitial'
import { usePersonColor } from '@/pages/staff/schedule/personColor'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { EmptyGuide } from '@/shared/EmptyGuide'
import { LoadError } from '@/shared/LoadError'
import { PRESSABLE } from '@/shared/pressable'
import { SectionHeader } from '@/shared/SectionHeader'
import { Skeleton, SkeletonGroup } from '@/shared/Skeleton'
import { useRevealChildren } from '@/shared/useReveal'
import { cn } from '@/ui/utils'

// 근무표: 알바생 모두가 같이 보는 전체 스케줄 (구글 캘린더 월간처럼) — 11/10 회의 · BE #31
// 날짜 칸 안에 그날 근무를 작은 블록(시작 시간 · 이름, 이름이 길면 두 줄)으로: 사람마다 파스텔 바탕 + 글자색만(personColor), 내 근무는 굵게, 대타는 1px 점선 테두리.
// 보고 있는 달의 날짜만 보여 주고 다른 달 칸은 빈칸 (‹ › 로 넘겼을 때만 그 달).
// 날짜를 누르면 아래에 그날 근무 목록 (내 근무 · 오늘 이후면 [대타 요청], 진행 중이면 "요청 중") + 그날 보낸 대타 요청 카드. ‹ › 로 달 이동. 한 번에 6주(최대 42일 ≤ BE 63일)를 불러온다

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
/** 칸 안에 보여 줄 블록 수 (넘으면 +N) */
const MAX_BLOCKS = 3

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
/** 칸이 좁아서(375px 폭에서 한 칸 47px) 사장님은 "사장"으로만 (아래 목록에는 이름 그대로) */
const blockName = (shift: CalendarShift) =>
  shift.assignee.role === 'owner' ? '사장' : shift.assignee.name.trim()
/** 4글자 이상 이름은 한 단계 작게 — 4글자까지는 칸에 다 보이고, 더 길면 … */
const LONG_NAME = 4

/** 대타 칸 점선 테두리 색: 그 사람 글자색을 살짝 투명하게 (outline 이라 블록 크기 · 글자 위치는 다른 블록과 같다) */
const dashedColor = (fg: string) => `color-mix(in srgb, ${fg} 70%, transparent)`

export function ScheduleMonth() {
  const { store } = useCurrentStore()
  const today = scheduleToday(store.id)
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() + 1 })
  const [selected, setSelected] = useState<Date>(today)
  const { start, end, days } = monthGrid(view.year, view.month)
  const calendarQuery = useScheduleCalendar(store.id, toDateKey(start), toDateKey(end))
  const me = myUserId()
  // 사람별 파스텔 색 (근무표 사람 목록 순서)
  const colorOf = usePersonColor(store.id)
  // 대타: 내가 보낸 요청(진행 중이면 [대타 요청] 대신 "요청 중") · 요청 시트를 띄울 근무
  const sentQuery = useSubstituteRequests(store.id, 'sent')
  const [sheetShift, setSheetShift] = useState<CalendarShift | null>(null)
  // 고른 날 근무 카드: 스크롤해서 처음 보일 때 살짝 떠오르기 (shared/useReveal). 날짜 · 근무가 바뀌면 다시 본다
  const dayListRef = useRevealChildren<HTMLDivElement>([
    toDateKey(selected),
    calendarQuery.data?.shifts.length,
  ])
  const todayKey = toDateKey(today)
  const pendingSentOf = (shift: CalendarShift) =>
    sentQuery.data?.requests.find(
      (r) =>
        r.status === 'PENDING' && r.assignmentId === shift.assignmentId && r.date === shift.date,
    )

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

  // 달 이동 줄: 왼쪽 "2026년 11월"(섹션 제목) + 오른쪽 ‹ › (MonthSwitcher). 아래 보조 한 줄은 근무표를 받은 뒤
  const switcher = (note?: ReactNode) => (
    <MonthSwitcher year={view.year} month={view.month} onMove={move}>
      {note}
    </MonthSwitcher>
  )

  const calendar = calendarQuery.data
  if (!calendar) {
    return (
      <>
        {switcher()}
        {calendarQuery.isError ? (
          <LoadError
            what="근무표를"
            error={calendarQuery.error}
            onRetry={() => calendarQuery.refetch()}
          />
        ) : (
          <CalendarSkeleton />
        )}
      </>
    )
  }

  const byDate = new Map<string, CalendarShift[]>()
  for (const shift of calendar.shifts) {
    byDate.set(shift.date, [...(byDate.get(shift.date) ?? []), shift])
  }
  const isMine = (shift: CalendarShift) => shift.assignee.userId === me
  const selectedKey = toDateKey(selected)
  const selectedShifts = byDate.get(selectedKey) ?? []
  // 그날 보낸 대타 요청 (최신 순, 이미 불러온 sent 목록). 대기 중인 요청이 내 근무 카드 안 "○○님에게 대타 요청 중"으로
  // 이미 보이면 아래 카드에서는 뺀다 (지난 날처럼 카드 안에 안 보이는 대기 요청은 아래에 남긴다)
  const shownInCard = new Set(
    selectedShifts
      .filter((s) => isMine(s) && s.date >= todayKey && s.assignmentId !== null)
      .map((s) => pendingSentOf(s)?.requestId)
      .filter(Boolean),
  )
  const sentOfDay = (sentQuery.data?.requests ?? []).filter(
    (r) => r.date === selectedKey && !shownInCard.has(r.requestId),
  )
  // 이 달에 근무하는 사람 (범례: 색 점 + 이름). 근무표 사람 목록에 없는 사람(퇴사 등)은 회색
  const monthPeople = [
    ...new Map(
      calendar.shifts
        .filter((shift) => fromDateKey(shift.date).getMonth() === view.month - 1)
        .map((shift) => [shift.assignee.userId, shift.assignee] as const),
    ).values(),
  ]
  // 이번 주 내 근무 (오늘이 보이는 달일 때만)
  const showWeek = days.some((d) => isSameDay(d, today))
  const week = showWeek ? toMySchedule(calendar, today, me) : null

  return (
    <>
      {switcher(
        week && week.weekHours > 0 && (
          <p className="m-0 text-[13px] leading-[1.45] font-medium text-balance text-muted-foreground">
            <strong className="font-bold text-foreground tabular-nums">{week.weekNote}</strong> · 내
            근무 기준
          </p>
        ),
      )}

      {calendar.shifts.length === 0 ? (
        <EmptyGuide
          message="이 달에는 정해진 근무가 없어요"
          hint="사장님이 근무표를 만들면 여기서 다 같이 볼 수 있어요"
        />
      ) : (
        <section className="flex flex-col gap-2 rounded-3xl border border-line/60 bg-card px-2 pt-3 pb-2">
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-muted-foreground">
            {WEEKDAYS.map((w, i) => (
              <span key={w} className={cn(i === 0 && 'text-destructive')}>
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = toDateKey(day)
              const shifts = byDate.get(key) ?? []
              const inMonth = day.getMonth() === view.month - 1
              const isToday = isSameDay(day, today)
              const isSelected = isSameDay(day, selected)
              // 다른 달 칸은 빈칸 (숫자 · 블록 없음, 누를 수 없음). 달력 줄은 1일 ~ 말일이 있는 주만이라 5줄 또는 6줄
              if (!inMonth) {
                return (
                  <div
                    key={key}
                    aria-hidden="true"
                    className="min-h-[78px] border-t border-line/40"
                  />
                )
              }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(day)}
                  aria-pressed={isSelected}
                  aria-label={`${formatDate(day)} 근무 ${shifts.length}개`}
                  className={cn(
                    'flex min-h-[78px] min-w-0 flex-col gap-[3px] border-t border-line/40 px-[2px] pt-1 pb-1.5 text-left transition-colors duration-150',
                    isSelected && 'rounded-[10px] bg-background',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-[22px] items-center justify-center self-center rounded-full text-xs tabular-nums',
                      isToday ? 'bg-brand font-bold text-white' : 'font-semibold',
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {shifts.slice(0, MAX_BLOCKS).map((shift) => {
                    const name = blockName(shift)
                    const mine = isMine(shift)
                    const [bg, fg] = colorOf(shift.assignee.userId)
                    // 시간 · 이름이 한 줄에 들어가면 한 줄("15 지은"), 안 들어가면 이름이 아랫줄로 ("15" / "김민수")
                    // 파스텔 바탕 + 글자색만 (줄 · 테두리 없음). 내 근무는 굵게, 대타는 1px 점선(outline: 안쪽으로 그려 크기 그대로)
                    return (
                      <span
                        key={shiftKey(shift)}
                        className={cn(
                          'flex min-w-0 flex-wrap items-baseline gap-x-[3px] rounded-[4px] px-[2px] py-px text-[10px] leading-[1.3]',
                          mine ? 'font-extrabold' : 'font-medium',
                          shift.substituted && 'outline-1 -outline-offset-1 outline-dashed',
                        )}
                        style={{
                          background: bg,
                          outlineColor: shift.substituted ? dashedColor(fg) : undefined,
                          color: fg,
                        }}
                      >
                        <span className="shrink-0 tabular-nums">{hourText(shift.start)}</span>
                        <span
                          data-name
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
          <div className="flex flex-col gap-1.5 px-1.5 pt-0.5 text-[11px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1">
                <LegendBlock bold />내 근무(굵게)
              </span>
              <span className="flex items-center gap-1">
                <LegendBlock substituted />
                대타(점선)
              </span>
            </div>
            {/* 이 달에 근무하는 사람 색 (4명이 넘으면 색이 반복돼서 이름을 같이) */}
            <ul aria-label="사람별 색" className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0">
              {monthPeople.map((person) => {
                const [bg, fg] = colorOf(person.userId)
                return (
                  <li key={person.userId} className="flex items-center gap-1 text-foreground">
                    <span
                      className="size-2.5 rounded-full shadow-[inset_0_0_0_1px_currentColor]"
                      style={{ background: bg, color: fg }}
                    />
                    {person.name}
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      {calendar.shifts.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeader title={`${formatDate(selected)} 근무`} />
          {selectedShifts.length === 0 ? (
            <EmptyGuide message="이날은 근무가 없어요" />
          ) : (
            <div ref={dayListRef} className="flex flex-col gap-2">
              {selectedShifts.map((shift) => {
                const mine = isMine(shift)
                // 대타 요청은 내 근무 · 오늘 이후만. 하루 조정한 근무(assignmentId null)는 BE 가 막는다
                const canRequest = mine && shift.date >= todayKey && shift.assignmentId !== null
                const pendingSent = canRequest ? pendingSentOf(shift) : undefined
                return (
                  <div
                    key={shiftKey(shift)}
                    className={cn(
                      // 흰 바탕 위 연한 카드 + 옅은 테두리 (docs/08 4). 내 근무는 매장 색 테두리 2px(안쪽 1px 더해 크기 그대로)
                      'flex flex-col gap-3 rounded-3xl border border-line/60 bg-card px-4 py-3.5',
                      mine && 'border-brand ring-1 ring-brand ring-inset',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <PersonInitial
                        name={shift.assignee.name}
                        color={colorOf(shift.assignee.userId)}
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center gap-1.5">
                          <span className="text-base leading-[1.4] font-bold">
                            {shift.assignee.name}
                          </span>
                          {mine && (
                            <span className="rounded-full bg-brand px-2 py-px text-[11px] font-bold text-white">
                              나
                            </span>
                          )}
                          {shift.substituted && (
                            <span className="rounded-full bg-warm px-2 py-px text-[11px] font-bold text-warm-foreground">
                              대타
                            </span>
                          )}
                        </span>
                        <span className="text-[13px] text-muted-foreground">
                          {[shift.name, shift.role].filter((t) => t.trim()).join(' · ') || '근무'}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className="text-[15px] font-bold tabular-nums">
                          {shift.start} – {shift.end}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {shiftHours(shift)}시간
                        </span>
                      </span>
                    </div>
                    {/* 대타를 요청할 수 있는 내 근무만: 얇은 구분선 아래 오른쪽에 작은 [대타 요청] (대기 중이면 그 자리에 "○○님에게 대타 요청 중") */}
                    {canRequest && (
                      <div className="-mt-0.5 flex justify-end border-t border-line/70 pt-2.5">
                        {pendingSent ? (
                          <span className="flex h-8 items-center gap-1.5 rounded-full bg-brand-soft py-0 pr-3 pl-1.5 text-[13px] font-bold text-brand">
                            <PersonInitial
                              name={pendingSent.target.name}
                              color={colorOf(pendingSent.target.userId)}
                              size={20}
                            />
                            {pendingSent.target.name}님에게 대타 요청 중
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSheetShift(shift)}
                            className={cn(
                              'flex h-8 items-center gap-1 rounded-full bg-brand-soft px-3 text-[13px] font-bold text-brand',
                              PRESSABLE,
                            )}
                          >
                            <ArrowLeftRight className="size-3.5" strokeWidth={2.4} />
                            대타 요청
                            <ChevronRight className="-mr-1 size-3.5" strokeWidth={2.4} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <SentSubstitutesOfDay requests={sentOfDay} colorOf={colorOf} />
        </section>
      )}
      {sheetShift && (
        <SubstituteSheet
          storeId={store.id}
          shift={sheetShift}
          onClose={() => setSheetShift(null)}
        />
      )}
    </>
  )
}

/** 범례용 작은 블록 (회색): 내 근무 = 굵은 글자, 대타 = 점선 테두리 */
function LegendBlock({ bold, substituted }: { bold?: boolean; substituted?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'rounded-[3px] px-[4px] py-px text-[9px] leading-[1.3]',
        bold ? 'font-extrabold' : 'font-medium',
        substituted && 'outline-1 -outline-offset-1 outline-dashed',
      )}
      style={{
        background: 'var(--muted)',
        color: 'var(--muted-foreground)',
        outlineColor: substituted ? dashedColor('var(--muted-foreground)') : undefined,
      }}
    >
      9
    </span>
  )
}

/** 근무표 로딩 뼈대: 요일 줄 + 달력 5주 (달력 카드와 같은 모서리 · 테두리) */
function CalendarSkeleton() {
  return (
    <SkeletonGroup
      label="근무표를 불러오는 중"
      className="flex flex-col gap-2 rounded-3xl border border-line/60 bg-card px-2 pt-3 pb-3"
    >
      <Skeleton shape="line" className="mx-2 h-3" />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-sm" />
        ))}
      </div>
    </SkeletonGroup>
  )
}
