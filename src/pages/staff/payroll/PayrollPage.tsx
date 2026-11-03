import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { calcPay, payMonth, storePayrolls, sumPay, TAX_LABEL } from '@/api/mocks/staff/payroll'
import { shiftHours, type StaffStore } from '@/api/mocks/staff/stores'
import { formatDate, formatWon } from '@/lib/format'
import { WorkHeader } from '@/pages/staff/schedule/components/WorkHeader'
import { useStaffStore } from '@/pages/staff/staffStore'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { Calendar } from '@/ui/Calendar'
import { Card } from '@/ui/Card'
import { Chip } from '@/ui/Chip'
import { cn } from '@/ui/utils'

const DAY_MS = 24 * 60 * 60 * 1000

// 예상 급여 (참고용): 확정 근무 × 시급 + 주휴수당 − 공제. 계산은 코드, 설명만 AI
export default function PayrollPage() {
  const { store, stores, setCurrentStoreId } = useCurrentStore()
  const paySettings = useStaffStore((state) => state.paySettings)
  const [showAll, setShowAll] = useState(false)
  const [selectedDay, setSelectedDay] = useState(store.today.getDate())

  const targets = showAll ? stores : [store]
  const results = targets.map((s) => calcPay(storePayrolls[s.id], paySettings[s.id]))
  const total = sumPay(results)
  const settings = paySettings[store.id]
  const taxTypes = new Set(targets.map((s) => paySettings[s.id].tax))
  const hourly = total.hours ? Math.round(total.base / total.hours) : 0

  // 급여일: 다음 달 n일 (31 = 말일)
  const payDate = new Date(
    payMonth.year,
    payMonth.month,
    settings.payday === 31
      ? new Date(payMonth.year, payMonth.month + 1, 0).getDate()
      : settings.payday,
  )
  const dDay = Math.round((payDate.getTime() - store.today.getTime()) / DAY_MS)

  return (
    <div className="flex flex-col gap-4">
      <WorkHeader segment="pay" />

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

        <Card variant="dark" className="gap-1.5 px-[18px] pt-[22px] pb-[18px]">
          <div className="flex items-center justify-between gap-2.5 px-1">
            <span className="text-sm font-semibold whitespace-nowrap opacity-85">
              {formatDate(payDate)} 입금 예정 · D-{dDay}
            </span>
            <Link
              to={`/staff/stores/${store.id}`}
              className="py-1 text-[13px] font-semibold whitespace-nowrap text-white opacity-85"
            >
              급여 설정 ›
            </Link>
          </div>
          <span className="px-1 pt-1.5 text-[44px] leading-[1.1] font-extrabold tracking-[-0.035em]">
            {formatWon(total.net)}
          </span>
          <span className="px-1 pb-2.5 text-sm opacity-75">
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
          stores={targets}
          showAll={showAll}
          today={store.today}
          selectedDay={selectedDay}
          onSelect={setSelectedDay}
        />

        <div className="flex items-start gap-3.5 rounded-[24px] bg-card px-5 py-[18px] shadow-soft">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Sparkles className="size-[18px]" fill="currentColor" />
          </span>
          <p className="m-0 text-[15px] leading-[1.65] break-keep text-[#2E3A33]">
            {storePayrolls[store.id].aiNote}
          </p>
        </div>
      </div>
    </div>
  )
}

function PayTile({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col gap-1 rounded-2xl bg-white/10 px-2.5 py-3">
      <span className="text-xs whitespace-nowrap opacity-80">{label}</span>
      <span className="text-[15px] font-extrabold whitespace-nowrap">{value}</span>
    </span>
  )
}

interface PayCalendarProps {
  stores: StaffStore[]
  showAll: boolean
  today: Date
  selectedDay: number
  onSelect: (day: number) => void
}

function PayCalendar({ stores, showAll, today, selectedDay, onSelect }: PayCalendarProps) {
  const lastDay = new Date(payMonth.year, payMonth.month, 0).getDate()
  const todayDate = today.getDate()

  const infoOf = (day: number) =>
    stores
      .map((s) => ({
        store: s,
        worked: storePayrolls[s.id].worked.includes(day),
        planned: storePayrolls[s.id].planned.includes(day),
      }))
      .filter((i) => i.worked || i.planned)

  let workedCount = 0
  let plannedCount = 0
  for (let day = 1; day <= lastDay; day++) {
    const info = infoOf(day)
    if (info.some((i) => i.worked)) workedCount++
    else if (info.length) plannedCount++
  }

  const selected = infoOf(selectedDay)
  const selectedWorked = selected.some((i) => i.worked)
  const selectedHours = selected.reduce((sum, i) => sum + shiftHours(i.store), 0)

  return (
    <section className="flex flex-col gap-3.5 rounded-[28px] bg-card px-[18px] pt-5 pb-[18px] shadow-soft">
      <div className="flex items-baseline justify-between gap-2.5 px-1">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.02em]">{payMonth.month}월</h2>
        <span className="text-[13px] font-semibold whitespace-nowrap text-[#4F554D]">
          근무 {workedCount}일 · 예정 {plannedCount}일
        </span>
      </div>

      <Calendar
        year={payMonth.year}
        month={payMonth.month}
        renderDay={(day) => {
          const info = infoOf(day)
          const worked = info.some((i) => i.worked)
          const colors = info.map((i) => (i.worked ? i.store.color : i.store.soft))
          const background = !colors.length
            ? 'transparent'
            : colors.length === 1
              ? colors[0]
              : `conic-gradient(${colors[0]} 0 50%, ${colors[1]} 50% 100%)`
          const color = worked
            ? '#fff'
            : info.length
              ? info[0].store.color
              : day > todayDate
                ? '#A3A69E'
                : '#1F2A24'
          return (
            <button
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={day === selectedDay}
              style={{ background, color }}
              className={cn(
                'flex size-8 items-center justify-center rounded-full p-0 text-sm',
                info.length ? 'font-bold' : 'font-medium',
                day === selectedDay && 'shadow-[0_0_0_2px_#FBF8F3,0_0_0_4px_var(--brand)]',
              )}
            >
              {day}
            </button>
          )
        }}
      />

      <div className="flex items-center justify-between gap-3 rounded-[20px] bg-background px-4 py-3.5">
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className="text-[15px] font-extrabold">
            {formatDate(new Date(payMonth.year, payMonth.month - 1, selectedDay))}
          </span>
          <span className="text-[13px] leading-normal text-[#6B7068]">
            {selected.length
              ? selected
                  .map(
                    (i) =>
                      `${showAll ? `${i.store.name} ` : ''}${i.store.shift.start} – ${i.store.shift.end}${i.worked ? '' : ' · 예정'}`,
                  )
                  .join(' · ')
              : '근무 없음'}
          </span>
        </span>
        {selected.length > 0 && (
          <span
            className={cn(
              'text-xl font-extrabold tracking-[-0.02em] whitespace-nowrap',
              selectedWorked ? 'text-foreground' : 'text-brand',
            )}
          >
            {selectedHours}시간{selectedWorked ? '' : ' 예정'}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 px-1 pt-0.5 text-xs text-[#6B7068]">
        {(showAll
          ? [
              ...stores.map((s) => ({ label: s.name, color: s.color })),
              { label: '예정 · 연한 색', color: '#D9D2C4' },
            ]
          : [
              { label: '근무', color: 'var(--brand)' },
              { label: '예정', color: 'var(--brand-soft)' },
            ]
        ).map((legend) => (
          <span key={legend.label} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: legend.color }} />
            {legend.label}
          </span>
        ))}
      </div>
    </section>
  )
}
