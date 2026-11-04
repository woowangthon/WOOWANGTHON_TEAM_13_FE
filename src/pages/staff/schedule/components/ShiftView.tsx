import { ArrowRight, Check } from 'lucide-react'
import { Link } from 'react-router'
import { useMyAvailability, useMySchedule } from '@/lib/api/schedule'
import { fromDateKey, isSameDay } from '@/lib/date'
import { formatDate } from '@/lib/format'
import { WorkHeader } from '@/pages/staff/schedule/components/WorkHeader'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { EmptyGuide } from '@/shared/EmptyGuide'
import { LoadError } from '@/shared/LoadError'
import { Badge } from '@/ui/Badge'
import { Spinner } from '@/ui/Spinner'
import { cn } from '@/ui/utils'

// 근무표: 이번 주 근무 시간(주휴 기준 15시간) · 내 근무 · 가능 시간 제출 (useMySchedule · useMyAvailability)
export function ShiftView() {
  const { store } = useCurrentStore()
  const scheduleQuery = useMySchedule(store.id)
  const availabilityQuery = useMyAvailability(store.id)
  const schedule = scheduleQuery.data
  const availability = availabilityQuery.data

  if (!schedule || !availability) {
    const failed = scheduleQuery.isError
      ? scheduleQuery
      : availabilityQuery.isError
        ? availabilityQuery
        : null
    return (
      <div className="flex flex-col gap-4">
        <WorkHeader segment="shift" />
        {failed ? <LoadError error={failed.error} onRetry={() => failed.refetch()} /> : <Spinner />}
      </div>
    )
  }

  const { weekHours, weeklyAllowanceHours: WEEKLY_ALLOWANCE_HOURS, weekNote } = schedule
  const today = fromDateKey(schedule.today)
  const shifts = schedule.shifts
  const submitted = availability.submittedAt !== null
  const availabilityMonth = Number(availability.month.split('-')[1])
  const percent = Math.min(100, Math.round((weekHours / WEEKLY_ALLOWANCE_HOURS) * 100))

  return (
    <div className="flex flex-col gap-4">
      <WorkHeader segment="shift" />

      <section className="flex items-center gap-5 rounded-[28px] bg-card p-[22px]">
        <div
          className="flex size-[116px] shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(var(--brand) 0 ${percent}%, #E9E3D8 ${percent}% 100%)`,
          }}
          role="img"
          aria-label={`이번 주 ${weekHours}시간 / ${WEEKLY_ALLOWANCE_HOURS}시간`}
        >
          <div className="flex size-24 flex-col items-center justify-center rounded-full bg-card">
            <span className="text-[30px] leading-none font-bold">{weekHours}h</span>
            <span className="mt-1 text-[11px] whitespace-nowrap text-muted-foreground">
              / {WEEKLY_ALLOWANCE_HOURS}시간
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 break-keep">
          <h2 className="m-0 text-lg font-bold">이번 주 근무</h2>
          <span className="text-[13px] leading-relaxed text-[#4F554D]">
            {weekNote || '이번 주 근무가 없어요'}
          </span>
        </div>
      </section>

      {shifts.length > 0 ? (
        <ol className="m-0 flex list-none flex-col p-0 pt-1">
          {shifts.map((shift, i) => {
            const date = fromDateKey(shift.date)
            const isToday = isSameDay(date, today)
            // 근무 이름 · 나 · 함께 일하는 사람 (예: 마감 · 지은 · 도윤)
            const people = [store.staffName, ...shift.crew].filter(Boolean).join(' · ')
            return (
              <li key={shift.shiftId} className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-3">
                <span className="flex flex-col items-center">
                  <span className={cn('h-6 w-0.5 bg-line', i === 0 && 'invisible')} />
                  <span
                    className={cn(
                      'size-4 shrink-0 rounded-full border-2',
                      isToday
                        ? 'border-brand bg-brand shadow-[0_0_0_4px_var(--brand-soft)]'
                        : 'border-[#9AA19C] bg-background',
                    )}
                  />
                  <span
                    className={cn('w-0.5 flex-1 bg-line', i === shifts.length - 1 && 'invisible')}
                  />
                </span>
                <div
                  className={cn(
                    'mb-2.5 flex flex-col gap-[5px] rounded-[26px]',
                    isToday ? 'bg-brand texture px-[22px] py-5 text-white' : 'px-2 py-3.5',
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2.5">
                    <span className="text-[19px] font-extrabold tracking-[-0.02em]">
                      {formatDate(date)}
                    </span>
                    <span className="text-sm font-semibold whitespace-nowrap opacity-85">
                      {shift.start} – {shift.end}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2.5">
                    <span className="min-w-0 flex-1 text-[13px] break-keep opacity-70">
                      {people ? `${shift.role} · ${people}` : shift.role}
                    </span>
                    {isToday && (
                      <Badge variant="white" size="md">
                        오늘
                      </Badge>
                    )}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <EmptyGuide
          message="아직 확정된 근무가 없어요"
          hint="아래에서 근무 가능 시간을 내면 사장님이 근무표를 짜요"
        />
      )}

      <Link
        to="/staff/availability"
        className={cn(
          'flex items-center justify-between gap-3 rounded-[28px] p-5 text-left',
          submitted ? 'bg-card text-foreground' : 'bg-ink texture text-white',
        )}
      >
        <span className="flex flex-col gap-[5px]">
          <span className="text-lg font-bold">
            {availabilityMonth}월 가능 시간{submitted ? ' · 제출 완료' : ' 제출'}
          </span>
          <span className="text-[13px] opacity-80">
            {submitted ? '확정 대기' : `${formatDate(fromDateKey(availability.deadline))} 마감`}
          </span>
        </span>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-foreground">
          {submitted ? <Check className="size-[22px]" /> : <ArrowRight className="size-[22px]" />}
        </span>
      </Link>
    </div>
  )
}
