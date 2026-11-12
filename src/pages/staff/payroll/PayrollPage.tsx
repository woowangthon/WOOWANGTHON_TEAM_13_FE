import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMyPayrollEstimates } from '@/lib/api/payroll'
import { myUserId, overlaps, useMySchedule, useScheduleCalendars } from '@/lib/api/schedule'
import { useScheduleWorkersOf } from '@/lib/api/substitute'
import type { PayWorkDay, PayrollEstimate, TaxType } from '@/lib/api/types'
import { fromDateKey, toDateKey } from '@/lib/date'
import { formatDate, formatHours, formatLongDate, formatWon } from '@/lib/format'
import { PersonInitial } from '@/pages/staff/schedule/components/PersonInitial'
import { WorkHeader } from '@/pages/staff/schedule/components/WorkHeader'
import { personColor } from '@/pages/staff/schedule/personColor'
import { useCurrentStore, type StaffStoreView } from '@/pages/staff/useCurrentStore'
import { EmptyGuide } from '@/shared/EmptyGuide'
import { LoadError } from '@/shared/LoadError'
import { Button } from '@/ui/Button'
import { Calendar } from '@/ui/Calendar'
import { Card } from '@/ui/Card'
import { Chip } from '@/ui/Chip'
import { Spinner } from '@/ui/Spinner'
import { cn } from '@/ui/utils'

const DAY_MS = 24 * 60 * 60 * 1000

const TAX_LABEL: Record<TaxType, string> = {
  none: '공제 없음',
  '3.3': '3.3% 공제',
  ins: '4대보험 공제',
}

/** 매장 + 그 매장 예상 급여 */
type Target = { store: StaffStoreView; estimate: PayrollEstimate }

// 예상 급여 (참고용): 확정 근무 × 시급 + 주휴수당 − 공제. 계산은 서버 규칙(useMyPayrollEstimate), 설명만 AI
// "전체"는 매장별 금액을 더하기만 한다
export default function PayrollPage() {
  const navigate = useNavigate()
  const { store, stores, setCurrentStoreId } = useCurrentStore()
  const [showAll, setShowAll] = useState(false)
  const [pickedDay, setPickedDay] = useState<number | null>(null)
  // 보는 달 (null = 서버 기준 이번 달). ‹ › 로 지난달 · 다음 달
  const [viewMonth, setViewMonth] = useState<string | null>(null)

  const targetStores = showAll ? stores : [store]
  const estimatesResult = useMyPayrollEstimates(
    targetStores.map((s) => s.id),
    viewMonth,
  )
  const estimates = estimatesResult.data
  const scheduleQuery = useMySchedule(store.id)
  const schedule = scheduleQuery.data

  if (!estimates || !schedule) {
    const error = estimatesResult.error ?? scheduleQuery.error
    const retry = () => {
      estimatesResult.retry()
      if (scheduleQuery.isError) scheduleQuery.refetch()
    }
    return (
      <div className="flex flex-col gap-4">
        <WorkHeader segment="pay" />
        {error ? <LoadError what="예상 급여를" error={error} onRetry={retry} /> : <Spinner />}
      </div>
    )
  }

  const targets: Target[] = targetStores.map((s, i) => ({ store: s, estimate: estimates[i] }))
  const sum = (pick: (e: PayrollEstimate) => number) =>
    estimates.reduce((acc, e) => acc + pick(e), 0)
  const total = {
    hours: sum((e) => e.hours),
    base: sum((e) => e.basePay),
    weeklyAllowance: sum((e) => e.weeklyAllowance),
    gross: sum((e) => e.grossPay),
    deduction: sum((e) => e.deduction),
    net: sum((e) => e.netPay),
  }
  const current = targets.find((t) => t.store.id === store.id)?.estimate ?? estimates[0]
  const settings = { payday: current.payday, tax: current.taxType }
  const taxTypes = new Set(estimates.map((e) => e.taxType))
  const hourly = total.hours ? Math.round(total.base / total.hours) : 0
  const [year, month] = current.month.split('-').map(Number)
  const payMonth = { year, month }
  const today = fromDateKey(schedule.today)
  // 고른 날 (없으면 상세 카드 없이 안내 한 줄). 달을 넘기면 닫는다
  const selectedDay = pickedDay
  const moveMonth = (step: number) => {
    const next = new Date(year, month - 1 + step, 1)
    setViewMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`)
    setPickedDay(null)
  }
  // 보고 있는 매장 모두 근무가 없으면 (새 매장) 0원 카드 · 빈 달력 대신 안내
  const noWork = estimates.every((e) => e.workDays.length === 0)
  const setSelectedDay = setPickedDay

  // 급여일: 다음 달 n일 (31 = 말일). 사장님이 아직 안 정했으면(null) 입금일 대신 달만 보여 준다
  const payDate =
    settings.payday === null
      ? null
      : new Date(
          payMonth.year,
          payMonth.month,
          // 31(말일)이나 29 · 30일이 없는 달(2월 등)은 그 달 말일로
          Math.min(settings.payday, new Date(payMonth.year, payMonth.month + 1, 0).getDate()),
        )
  const dDay = payDate ? Math.round((payDate.getTime() - today.getTime()) / DAY_MS) : null
  const payDateText =
    payDate === null || dDay === null
      ? `${payMonth.month}월 예상 급여 · 급여일 미정`
      : dDay >= 0
        ? `${formatDate(payDate)} 입금 예정 · D-${dDay}`
        : `${formatDate(payDate)} 입금`

  // 달 넘기기 (근무가 없는 달이어도 보이게 맨 위에)
  const monthSwitcher = (
    <div className="flex items-center justify-center gap-1.5">
      <button
        type="button"
        aria-label="지난달"
        onClick={() => moveMonth(-1)}
        className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-card"
      >
        <ChevronLeft className="size-5" />
      </button>
      <span className="min-w-[96px] text-center text-[15px] font-bold tabular-nums">
        {payMonth.year}년 {payMonth.month}월
      </span>
      <button
        type="button"
        aria-label="다음 달"
        onClick={() => moveMonth(1)}
        className="flex size-9 items-center justify-center rounded-full text-muted-foreground active:bg-card"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <WorkHeader segment="pay" />
      {monthSwitcher}

      <div className="flex flex-col gap-3.5">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pt-0.5 pb-1">
          <Chip
            active={showAll}
            onClick={() => setShowAll(true)}
            className="h-[42px] px-[18px] py-0 text-[15px] font-bold shadow-[0_6px_18px_rgba(40,46,36,0.05)]"
          >
            전체
          </Chip>
          {stores.map((s) => (
            <Chip
              key={s.id}
              active={!showAll && s.id === store.id}
              onClick={() => {
                setShowAll(false)
                setCurrentStoreId(s.id)
              }}
              className="h-[42px] px-[18px] py-0 text-[15px] font-bold shadow-[0_6px_18px_rgba(40,46,36,0.05)]"
            >
              {s.name}
            </Chip>
          ))}
        </div>

        {noWork ? (
          <EmptyGuide
            message="아직 계산할 근무가 없어요"
            hint="근무가 정해지면 바로 계산해 드려요"
            action={
              <Button
                size="md"
                className="h-[46px] px-5"
                onClick={() => navigate('/staff/schedule')}
              >
                근무표 보기
              </Button>
            }
          />
        ) : (
          <>
            <Card variant="dark" className="gap-1.5 px-[18px] pt-[22px] pb-[18px]">
              <div className="flex items-center justify-between gap-2.5 px-1">
                <span className="text-sm font-semibold whitespace-nowrap opacity-85">
                  {payDateText}
                </span>
                <Link
                  to={`/staff/stores/${store.id}`}
                  className="py-1 text-[13px] font-semibold whitespace-nowrap text-white opacity-85"
                >
                  급여 설정 ›
                </Link>
              </div>
              <span className="px-1 pt-1.5 text-[44px] leading-[1.1] font-extrabold tracking-[-0.035em] tabular-nums">
                {formatWon(total.net)}
              </span>
              <span className="px-1 pb-2.5 text-sm tabular-nums opacity-75">
                세전 {formatWon(total.gross)} · 참고용
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <PayTile
                  label={`${total.hours}시간 × ${hourly.toLocaleString('ko-KR')}`}
                  value={formatWon(total.base)}
                />
                <PayTile label="주휴수당" value={`+ ${formatWon(total.weeklyAllowance)}`} />
                <PayTile
                  label={taxTypes.size > 1 ? '공제' : TAX_LABEL[settings.tax]}
                  value={total.deduction ? `− ${formatWon(total.deduction)}` : '0원'}
                />
              </div>
            </Card>

            <PayCalendar
              targets={targets}
              payMonth={payMonth}
              showAll={showAll}
              todayKey={toDateKey(today)}
              selectedDay={selectedDay}
              // 같은 날을 다시 누르면 상세 카드 닫기
              onSelect={(day) => setSelectedDay(day === selectedDay ? null : day)}
            />

            {current.aiNote && (
              <div className="flex items-start gap-3.5 rounded-[24px] bg-card px-5 py-[18px] shadow-soft">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Sparkles className="size-[18px]" fill="currentColor" />
                </span>
                <p className="m-0 text-[15px] leading-[1.65] break-keep text-[#2E3A33]">
                  {current.aiNote}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PayTile({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col gap-1 rounded-2xl bg-white/10 px-2.5 py-3">
      <span className="text-xs whitespace-nowrap tabular-nums opacity-80">{label}</span>
      {/* 금액은 오른쪽 끝에 맞춘다 */}
      <span className="text-right text-[15px] font-extrabold whitespace-nowrap tabular-nums">
        {value}
      </span>
    </span>
  )
}

interface PayCalendarProps {
  targets: Target[]
  payMonth: { year: number; month: number }
  showAll: boolean
  /** 오늘 "2026-11-20" — 지난날 · 앞으로의 날 색 구분 */
  todayKey: string
  /** 고른 날 (null 이면 상세 카드 없음) */
  selectedDay: number | null
  onSelect: (day: number) => void
}

// 예상 급여 달력: 근무표(공유 달력)와 같은 모양 — 날짜 숫자 밑에 그날 내 근무를 작은 블록(근무 시간 "6h")으로.
// 일한 날은 진한 매장 색, 예정은 연한 색. 달력 칸은 나현 ui/Calendar 의 renderDay 로 그린다 (ui 는 그대로).
// 날짜를 누르면 달력 아래에 그날 상세 카드(시간 · 근무 이름 · 시간 합계), 같은 날을 다시 누르면 닫는다
function PayCalendar({
  targets,
  payMonth,
  showAll,
  todayKey,
  selectedDay,
  onSelect,
}: PayCalendarProps) {
  const lastDay = new Date(payMonth.year, payMonth.month, 0).getDate()
  const stores = targets.map((t) => t.store)
  const keyOf = (day: number) =>
    `${payMonth.year}-${String(payMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const dateOf = (day: number) => new Date(payMonth.year, payMonth.month - 1, day)

  // 근무 이름(오픈 · 마감): 예상 급여에는 없어서 그 달 근무표에서 같은 날 · 같은 시간의 내 근무를 찾는다 (못 찾으면 "근무")
  const calendars = useScheduleCalendars(
    stores.map((s) => s.id),
    keyOf(1),
    keyOf(lastDay),
  )
  const me = myUserId()
  const shiftName = (storeIndex: number, workDay: PayWorkDay) =>
    calendars[storeIndex]?.data?.shifts
      .find(
        (s) =>
          s.date === workDay.date &&
          s.start === workDay.start &&
          s.end === workDay.end &&
          s.assignee.userId === me,
      )
      ?.name.trim() || '근무'

  // 함께 일한 사람: 같은 매장 · 같은 날 근무표에서 내 근무와 시간이 조금이라도 겹치는 다른 사람 (사장님 포함, 한 사람은 한 번, 시작 시간 순).
  // 근무표를 못 불러왔으면 null → 그 줄을 숨긴다. 색은 근무표 탭과 같은 사람별 파스텔
  const workersOf = useScheduleWorkersOf(stores.map((s) => s.id))
  const coworkersOf = (storeIndex: number, workDay: PayWorkDay) => {
    const shifts = calendars[storeIndex]?.data?.shifts
    if (!shifts) return null
    const seen = new Set<string>()
    return shifts
      .filter((s) => s.date === workDay.date && s.assignee.userId !== me && overlaps(s, workDay))
      .sort((a, b) => a.start.localeCompare(b.start))
      .filter((s) => !seen.has(s.assignee.userId) && seen.add(s.assignee.userId))
      .map((s) => ({
        userId: s.assignee.userId,
        name: s.assignee.name,
        color: personColor(s.assignee.userId, workersOf[storeIndex]?.data?.workers),
      }))
  }

  // 그날 매장별 내 근무 (일한 날 · 예정)
  const infoOf = (day: number) =>
    targets.flatMap(({ store, estimate }, storeIndex) =>
      estimate.workDays
        .filter((d) => d.date === keyOf(day))
        .map((workDay) => ({ store, storeIndex, workDay, worked: workDay.status === 'worked' })),
    )

  let workedCount = 0
  let plannedCount = 0
  for (let day = 1; day <= lastDay; day++) {
    const info = infoOf(day)
    if (info.some((i) => i.worked)) workedCount++
    else if (info.length) plannedCount++
  }

  const selected = selectedDay !== null ? infoOf(selectedDay) : []
  const selectedWorked = selected.some((i) => i.worked)
  const selectedHours = selected.reduce((sum, i) => sum + i.workDay.hours, 0)
  // 상태 칩 색: 그날 근무가 한 매장이면 그 매장 색 (전체 보기에서 다른 매장 근무를 지금 매장 색으로 칠하지 않게), 여러 매장이면 먹색
  const chipStore = selected.every((i) => i.store.id === selected[0]?.store.id)
    ? selected[0]?.store
    : null

  // 날짜를 누르면 상세 카드가 화면에 보이게 (375px 에서 달력이 한 화면을 거의 채워서). 아래 하단 탭만큼 띄운다
  const detailRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (selectedDay === null) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    detailRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }, [selectedDay])

  return (
    <>
      <section className="flex flex-col gap-3 rounded-[24px] bg-card px-2 pt-4 pb-3 shadow-soft">
        <div className="flex items-baseline justify-between gap-2.5 px-2.5">
          <h2 className="m-0 text-lg font-extrabold tracking-[-0.02em]">{payMonth.month}월</h2>
          <span className="text-[13px] font-semibold whitespace-nowrap text-foreground tabular-nums">
            근무 {workedCount}일 · 예정 {plannedCount}일
          </span>
        </div>

        <Calendar
          year={payMonth.year}
          month={payMonth.month}
          className="gap-x-0 gap-y-0.5"
          renderDay={(day) => {
            const info = infoOf(day)
            const isToday = keyOf(day) === todayKey
            const isSelected = day === selectedDay
            const future = keyOf(day) > todayKey
            return (
              <button
                type="button"
                onClick={() => onSelect(day)}
                aria-pressed={isSelected}
                // 화면 읽기: "11월 13일 09:00–15:00 6시간 예정" (블록 글자는 "6h" 만)
                aria-label={`${payMonth.month}월 ${day}일 ${
                  info.length
                    ? info
                        .map(
                          (i) =>
                            `${showAll ? `${i.store.name} ` : ''}${i.workDay.start}–${i.workDay.end} ${formatHours(i.workDay.hours)} ${i.worked ? '근무' : '예정'}`,
                        )
                        .join(', ')
                    : '근무 없음'
                }`}
                className={cn(
                  'flex min-h-[58px] w-full min-w-0 flex-col items-stretch gap-[3px] rounded-[10px] px-[2px] pt-0.5 pb-1 transition-colors duration-150',
                  isSelected && 'bg-background shadow-[inset_0_0_0_1.5px_var(--line)]',
                )}
              >
                <span
                  className={cn(
                    'flex size-[22px] items-center justify-center self-center rounded-full text-xs tabular-nums',
                    isToday
                      ? 'bg-brand font-bold text-white'
                      : future && !info.length
                        ? 'font-medium text-faint'
                        : 'font-semibold',
                  )}
                >
                  {day}
                </span>
                {info.map(({ store, workDay, worked }) => (
                  <span
                    key={`${store.id}-${workDay.start}`}
                    aria-hidden="true"
                    style={
                      worked
                        ? { background: store.color, color: '#fff' }
                        : { background: store.soft, color: 'var(--foreground)' }
                    }
                    className="truncate rounded-[5px] px-[2px] py-px text-center text-[10px] leading-[1.35] font-semibold tabular-nums"
                  >
                    {formatHours(workDay.hours, true)}
                  </span>
                ))}
              </button>
            )
          }}
        />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 text-[11px] text-muted-foreground">
          {showAll ? (
            <>
              {stores.map((s) => (
                <span key={s.id} className="flex items-center gap-1">
                  <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
                  {s.name}
                </span>
              ))}
              <span>연한 색은 예정</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-[3px] bg-brand" />
                일한 날
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-[3px] bg-brand-soft" />
                예정
              </span>
            </>
          )}
        </div>

        {selectedDay === null && (
          <p className="m-0 px-2.5 text-[13px] text-muted-foreground">
            날짜를 누르면 그날 근무를 볼 수 있어요
          </p>
        )}
      </section>

      {/* 고른 날 상세: 날을 바꾸면 key 가 바뀌어 다시 부드럽게 나타난다 (움직임 줄이기면 바로) */}
      {selectedDay !== null && (
        <section
          key={selectedDay}
          ref={detailRef}
          aria-live="polite"
          className="flex animate-in scroll-mb-28 flex-col gap-3 rounded-[24px] bg-card px-5 pt-[18px] pb-4 shadow-soft duration-200 fade-in-0 slide-in-from-top-2 motion-reduce:animate-none"
        >
          <div className="flex items-center justify-between gap-2.5">
            <h3 className="m-0 text-[17px] font-extrabold tracking-[-0.01em]">
              {formatLongDate(dateOf(selectedDay))}
            </h3>
            {selected.length > 0 && (
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
                style={
                  selectedWorked
                    ? { background: chipStore?.color ?? 'var(--ink)', color: '#fff' }
                    : {
                        background: chipStore?.soft ?? 'var(--muted)',
                        color: chipStore?.color ?? 'var(--foreground)',
                      }
                }
              >
                {selectedWorked ? '일한 날' : '예정'}
              </span>
            )}
          </div>
          {selected.length === 0 ? (
            <p className="m-0 text-sm text-muted-foreground">이날은 근무가 없어요</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {selected.map(({ store, storeIndex, workDay, worked }) => (
                <li
                  key={`${store.id}-${workDay.start}`}
                  className="flex items-center gap-3 rounded-[18px] bg-background px-4 py-3"
                >
                  {/* 매장 색 막대: 일한 근무는 진하게, 예정은 연하게 */}
                  <span
                    aria-hidden="true"
                    className="w-1 self-stretch rounded-full"
                    style={{ background: worked ? store.color : store.soft }}
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-xl leading-tight font-extrabold tracking-[-0.02em] tabular-nums">
                      {workDay.start} – {workDay.end}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {[
                        showAll ? store.name : null,
                        shiftName(storeIndex, workDay),
                        formatHours(workDay.hours),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      {selected.length > 1 && !worked && selectedWorked ? ' · 예정' : ''}
                    </span>
                    <Coworkers people={coworkersOf(storeIndex, workDay)} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          {selected.length > 1 && (
            <span className="text-right text-[13px] font-semibold text-foreground tabular-nums">
              합계 {formatHours(selectedHours)}
            </span>
          )}
        </section>
      )}
    </>
  )
}

/** 상세 카드 근무 덩어리 아래 "함께 · (동그라미) 민수 · 도윤" — 없으면 "혼자 근무", 근무표를 못 불러왔으면(null) 숨김 */
function Coworkers({
  people,
}: {
  people: { userId: string; name: string; color: readonly [string, string] }[] | null
}) {
  if (!people) return null
  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
      <span className="sr-only">
        {people.length ? `함께 일한 사람 ${people.map((p) => p.name).join(', ')}` : '혼자 근무'}
      </span>
      <span aria-hidden="true" className="text-xs font-bold text-muted-foreground">
        함께
      </span>
      {people.length === 0 ? (
        <span aria-hidden="true" className="text-muted-foreground">
          혼자 근무
        </span>
      ) : (
        people.map((p) => (
          <span key={p.userId} aria-hidden="true" className="flex items-center gap-1 font-semibold">
            <PersonInitial name={p.name} color={p.color} size={22} />
            {p.name}
          </span>
        ))
      )}
    </span>
  )
}
