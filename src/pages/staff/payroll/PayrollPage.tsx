import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMyPayrollEstimates } from '@/lib/api/payroll'
import { useMySchedule } from '@/lib/api/schedule'
import type { PayrollEstimate, TaxType } from '@/lib/api/types'
import { fromDateKey, toDateKey } from '@/lib/date'
import { formatDate, formatWon } from '@/lib/format'
import { WorkHeader } from '@/pages/staff/schedule/components/WorkHeader'
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
  const isThisMonth = today.getFullYear() === year && today.getMonth() + 1 === month
  // 고른 날이 없으면 이번 달은 오늘, 다른 달은 1일
  // 고른 날 (없으면 달력 아래에 이번 주 근무 — 다른 달이면 첫 주)
  const selectedDay = pickedDay
  const weekBase = isThisMonth ? today.getDate() : 1
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
              weekBase={weekBase}
              // 같은 날을 다시 누르면 고르기 취소 (이번 주 보기)
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
  /** 고른 날 (null 이면 이번 주) */
  selectedDay: number | null
  /** 고른 날이 없을 때 보여 줄 주에 들어 있는 날 (이번 달이면 오늘) */
  weekBase: number
  onSelect: (day: number) => void
}

/** "18:00" → "18", "13:30" → "13:30" (칸이 좁아서 정각은 시만) */
const shortTime = (time: string) =>
  time.endsWith(':00')
    ? String(Number(time.slice(0, 2)))
    : `${Number(time.slice(0, 2))}:${time.slice(3)}`

// 예상 급여 달력: 근무표(공유 달력)와 같은 모양 — 날짜 숫자 밑에 그날 내 근무를 작은 블록("18–23")으로.
// 일한 날은 진한 매장 색, 예정은 연한 색. 달력 칸은 나현 ui/Calendar 의 renderDay 로 그린다 (ui 는 그대로)
function PayCalendar({
  targets,
  payMonth,
  showAll,
  todayKey,
  selectedDay,
  weekBase,
  onSelect,
}: PayCalendarProps) {
  const lastDay = new Date(payMonth.year, payMonth.month, 0).getDate()
  const stores = targets.map((t) => t.store)
  const keyOf = (day: number) =>
    `${payMonth.year}-${String(payMonth.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  // 그날 매장별 내 근무 (일한 날 · 예정)
  const infoOf = (day: number) =>
    targets.flatMap(({ store, estimate }) =>
      estimate.workDays
        .filter((d) => d.date === keyOf(day))
        .map((workDay) => ({ store, workDay, worked: workDay.status === 'worked' })),
    )

  let workedCount = 0
  let plannedCount = 0
  for (let day = 1; day <= lastDay; day++) {
    const info = infoOf(day)
    if (info.some((i) => i.worked)) workedCount++
    else if (info.length) plannedCount++
  }

  // 달력 아래 목록: 고른 날, 없으면 그 주(일~토, 이번 달 안)
  const firstWeekday = new Date(payMonth.year, payMonth.month - 1, 1).getDay()
  const weekStart = weekBase - ((firstWeekday + weekBase - 1) % 7)
  const listDays =
    selectedDay !== null
      ? [selectedDay]
      : Array.from({ length: 7 }, (_, i) => weekStart + i).filter((d) => d >= 1 && d <= lastDay)
  const listItems = listDays.flatMap((day) => infoOf(day).map((info) => ({ day, ...info })))
  const listHours = listItems.reduce((sum, i) => sum + i.workDay.hours, 0)

  return (
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
              aria-label={`${formatDate(new Date(payMonth.year, payMonth.month - 1, day))} ${
                info.length
                  ? info
                      .map(
                        (i) => `${i.workDay.start}–${i.workDay.end} ${i.worked ? '근무' : '예정'}`,
                      )
                      .join(', ')
                  : '근무 없음'
              }`}
              className={cn(
                'flex min-h-[58px] w-full min-w-0 flex-col items-stretch gap-[3px] rounded-[10px] px-[2px] pt-0.5 pb-1 transition-colors duration-150',
                isSelected && 'bg-background',
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
                  style={
                    worked
                      ? { background: store.color, color: '#fff' }
                      : { background: store.soft, color: 'var(--foreground)' }
                  }
                  className="truncate rounded-[5px] px-[2px] py-px text-center text-[10px] leading-[1.35] font-semibold tabular-nums"
                >
                  {shortTime(workDay.start)}–{shortTime(workDay.end)}
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

      {/* 근무 시간 목록 (회색): 고른 날 · 없으면 이번 주 */}
      <div className="flex flex-col gap-1 border-t border-[#F0EBE2] px-2.5 pt-3">
        <span className="flex items-baseline justify-between gap-2 text-[13px] font-bold text-foreground">
          {selectedDay !== null
            ? formatDate(new Date(payMonth.year, payMonth.month - 1, selectedDay))
            : '이번 주 근무'}
          {listItems.length > 0 && (
            <span className="font-semibold tabular-nums">
              {Math.round(listHours * 100) / 100}시간
            </span>
          )}
        </span>
        {listItems.length === 0 ? (
          <span className="text-[13px] text-muted-foreground">근무 없음</span>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {listItems.map(({ day, store, workDay, worked }) => (
              <li
                key={`${day}-${store.id}-${workDay.start}`}
                className="text-[13px] text-muted-foreground tabular-nums"
              >
                {formatDate(new Date(payMonth.year, payMonth.month - 1, day))}{' '}
                {showAll ? `${store.name} ` : ''}
                {workDay.start} – {workDay.end} · {workDay.hours}시간{worked ? '' : ' · 예정'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
