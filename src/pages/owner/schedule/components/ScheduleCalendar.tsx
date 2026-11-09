import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toastApiError } from '@/lib/api/errors'
import { fromDateKey, isSameDay, toDateKey } from '@/lib/date'
import { formatDate } from '@/lib/format'
import { useMembers } from '@/pages/owner/api/members'
import type { WorkShift } from '@/pages/owner/api/types'
import {
  canOwnerTakeShift,
  useAddShift,
  useDeleteShift,
  useMonthShifts,
  useSaveDayMemo,
} from '@/pages/owner/api/work'
import { avatarColors } from '@/pages/owner/components/avatarColors'
import { LoadError } from '@/shared/LoadError'
import { Button } from '@/ui/Button'
import { Spinner } from '@/ui/Spinner'
import { Textarea } from '@/ui/Textarea'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 근무 달력: 한 달 · 직원별로 보기 → 날짜를 누르면 그날 근무 · 추가 · 삭제 · 메모

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const OWNER = 'owner'

interface Person {
  memberId: string
  name: string
  bg: string
  fg: string
}

const monthKey = (date: Date) => toDateKey(date).slice(0, 7)

/** 직원 칩 점 색: 전체 회색 · 사장님 매장 색 · 직원은 글자 색 */
const chipDot = (p: Person) => (p.memberId === 'all' || p.memberId === OWNER ? p.bg : p.fg)

export function ScheduleCalendar({ storeId, today }: { storeId: string; today: Date }) {
  const [offset, setOffset] = useState(0)
  const [person, setPerson] = useState('all')
  const [selected, setSelected] = useState<string | null>(toDateKey(today))
  const base = new Date(today.getFullYear(), today.getMonth() + offset, 1)
  const month = monthKey(base)
  const shiftsQuery = useMonthShifts(storeId, month)
  const membersQuery = useMembers(storeId)

  const people: Person[] = [
    ...(membersQuery.data?.members ?? [])
      .filter((m) => m.status === 'active')
      .map((m, i) => {
        const [bg, fg] = avatarColors(i)
        return { memberId: m.memberId, name: m.name, bg, fg }
      }),
    // 진짜 API 는 사장님 근무를 아직 저장하지 못해서 고를 수 없게 뺀다
    ...(canOwnerTakeShift()
      ? [{ memberId: OWNER, name: '사장님', bg: 'var(--brand)', fg: '#F1ECE3' }]
      : []),
  ]
  // 목록에 없는 사람(퇴사 등)은 회색
  const colorOf = (id: string) =>
    people.find((p) => p.memberId === id) ?? {
      memberId: id,
      name: '',
      bg: '#E4E1DA',
      fg: '#6B7068',
    }

  const all = shiftsQuery.data?.shifts ?? []
  const shown = person === 'all' ? all : all.filter((s) => s.memberId === person)
  const hours = shown.reduce((sum, s) => sum + s.hours, 0)
  const days = new Set(shown.map((s) => s.date)).size
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  const firstWeekday = base.getDay()
  const selectedInMonth = selected?.startsWith(month) ? selected : null

  const move = (delta: number) => {
    setOffset((o) => o + delta)
    setSelected(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="flex flex-col gap-3 rounded-[28px] bg-card px-3.5 pt-[18px] pb-3.5 shadow-soft">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex flex-col gap-0.5">
            <h2 className="m-0 text-lg font-extrabold">
              {base.getFullYear()}년 {base.getMonth() + 1}월
            </h2>
            <span className="text-[13px] whitespace-nowrap text-muted-foreground">
              {person === 'all' ? `근무 ${shown.length}회` : `${days}일`} · {+hours.toFixed(1)}시간
            </span>
          </div>
          <div className="flex gap-1.5">
            <MonthButton label="이전 달" onClick={() => move(-1)}>
              <ChevronLeft className="size-5" />
            </MonthButton>
            <MonthButton label="다음 달" onClick={() => move(1)}>
              <ChevronRight className="size-5" />
            </MonthButton>
          </div>
        </div>

        <div
          className="no-scrollbar flex gap-1.5 overflow-x-auto px-1 pb-0.5"
          role="radiogroup"
          aria-label="직원"
        >
          {[{ memberId: 'all', name: '전체', bg: '#A3A69E', fg: '' }, ...people].map((p) => {
            const on = person === p.memberId
            return (
              <button
                key={p.memberId}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPerson(p.memberId)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full py-[7px] pr-[13px] pl-[11px] text-[13px] font-bold whitespace-nowrap',
                  on ? 'bg-brand text-white' : 'bg-background text-[#4F554D]',
                )}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: on ? '#fff' : chipDot(p) }}
                />
                {p.name}
              </button>
            )
          })}
        </div>

        {shiftsQuery.isPending ? (
          <Spinner />
        ) : shiftsQuery.error ? (
          <LoadError error={shiftsQuery.error} onRetry={() => shiftsQuery.refetch()} />
        ) : (
          <div className="grid grid-cols-7 gap-y-1.5">
            {WEEKDAYS.map((w) => (
              <span key={w} className="pb-0.5 text-center text-[11px] font-semibold text-faint">
                {w}
              </span>
            ))}
            {Array.from({ length: firstWeekday }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: lastDay }, (_, i) => {
              const date = new Date(base.getFullYear(), base.getMonth(), i + 1)
              const key = toDateKey(date)
              const dayShifts = shown.filter((s) => s.date === key)
              const done = date <= today
              const isToday = isSameDay(date, today)
              const one = person !== 'all'
              const has = dayShifts.length > 0
              const color = one ? colorOf(person) : null
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  aria-pressed={selectedInMonth === key}
                  aria-label={`${formatDate(date)} 근무 ${dayShifts.length}`}
                  className="flex flex-col items-center gap-[3px] py-0.5"
                >
                  <span
                    className={cn(
                      'flex size-[34px] items-center justify-center rounded-full border-[1.5px] text-sm',
                      isToday || (one && has) ? 'font-extrabold' : 'font-medium',
                      selectedInMonth === key && 'shadow-[0_0_0_2px_#FBF8F3,0_0_0_4px_#1F2A24]',
                    )}
                    style={{
                      background: color && has && done ? color.bg : 'transparent',
                      color: color && has ? color.fg : date > today ? '#6B7068' : '#1F2A24',
                      borderColor:
                        color && has && !done ? color.fg : isToday ? 'var(--brand)' : 'transparent',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex min-h-[15px] flex-wrap justify-center gap-0.5">
                    {!one &&
                      dayShifts.map((s) => {
                        const c = colorOf(s.memberId)
                        return (
                          <span
                            key={s.shiftId}
                            className="flex size-[15px] items-center justify-center rounded-full text-[9px] font-extrabold"
                            style={{ background: c.bg, color: c.fg, opacity: done ? 1 : 0.5 }}
                          >
                            {s.name.slice(0, 1)}
                          </span>
                        )
                      })}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {selectedInMonth && shiftsQuery.data && (
        <DayPanel
          key={selectedInMonth}
          storeId={storeId}
          date={selectedInMonth}
          today={today}
          shifts={shown.filter((s) => s.date === selectedInMonth)}
          working={all.filter((s) => s.date === selectedInMonth).map((s) => s.memberId)}
          people={people}
          defaultPerson={person}
          memo={shiftsQuery.data.memos[selectedInMonth] ?? ''}
        />
      )}
    </div>
  )
}

function MonthButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-[38px] items-center justify-center rounded-full bg-background"
    >
      {children}
    </button>
  )
}

const TIME = /^(\d{1,2}):(\d{2})$/
const toMinutes = (value: string) => {
  const m = TIME.exec(value.trim())
  if (!m || +m[1] > 23 || +m[2] > 59) return null
  return +m[1] * 60 + +m[2]
}
const pad = (value: string) => {
  const [h, m] = value.trim().split(':')
  return `${h.padStart(2, '0')}:${m}`
}

/** 그날 근무 · 추가 · 삭제 · 메모 */
function DayPanel({
  storeId,
  date,
  today,
  shifts,
  working,
  people,
  defaultPerson,
  memo,
}: {
  storeId: string
  date: string
  today: Date
  shifts: WorkShift[]
  working: string[]
  people: Person[]
  defaultPerson: string
  memo: string
}) {
  const [adding, setAdding] = useState(false)
  const free = people.filter((p) => !working.includes(p.memberId))
  const [who, setWho] = useState<string | undefined>(
    free.some((p) => p.memberId === defaultPerson) ? defaultPerson : free[0]?.memberId,
  )
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('14:00')
  const [memoText, setMemoText] = useState(memo)
  const add = useAddShift(storeId)
  const remove = useDeleteShift(storeId)
  const saveMemo = useSaveDayMemo(storeId)
  const day = fromDateKey(date)
  const done = day <= today
  const t1 = toMinutes(start)
  const t2 = toMinutes(end)
  const timeOk = t1 !== null && t2 !== null && t2 > t1
  const colorOf = (id: string) => people.find((p) => p.memberId === id)

  const submit = () => {
    if (!who || !timeOk) return
    add.mutate(
      { date, memberId: who, start: pad(start), end: pad(end) },
      {
        onSuccess: () => {
          setAdding(false)
          toast('근무를 추가했어요')
        },
        onError: (error) => toastApiError(error, '추가하지 못했어요. 다시 시도해 주세요', submit),
      },
    )
  }

  return (
    <section className="flex flex-col gap-2.5 rounded-[28px] bg-card px-4 py-[18px] shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <h3 className="m-0 px-0.5 text-base font-extrabold">{formatDate(day)}</h3>
        <Button
          variant="ink"
          size="sm"
          className="h-[34px] pr-[13px] pl-[9px]"
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? <X className="size-[17px]" /> : <Plus className="size-[17px]" />}
          {adding ? '닫기' : '추가'}
        </Button>
      </div>

      {shifts.length === 0 && (
        <span className="px-0.5 py-1 text-sm text-muted-foreground">근무 없음</span>
      )}
      {shifts.map((s) => {
        const c = colorOf(s.memberId)
        return (
          <div
            key={s.shiftId}
            className="flex items-center gap-3 rounded-[18px] bg-background px-3 py-2.5"
          >
            <span
              className="flex size-[38px] shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold"
              style={{ background: c?.bg, color: c?.fg }}
            >
              {s.name.slice(0, 1)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-bold">{s.name}</span>
              <span className="text-[13px] text-[#6B7068]">
                {s.start}–{s.end} · {+s.hours.toFixed(1)}시간
              </span>
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-[5px] text-xs font-bold whitespace-nowrap',
                done ? 'bg-accent text-brand' : 'bg-[#FBF1E4] text-[#A86A26]',
              )}
            >
              {done ? '완료' : '예정'}
            </span>
            <button
              type="button"
              aria-label={`${s.name} 근무 삭제`}
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(s.shiftId, {
                  onSuccess: () => toast('근무를 삭제했어요'),
                  onError: (error) => toastApiError(error, '삭제하지 못했어요. 다시 시도해 주세요'),
                })
              }
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-destructive-foreground"
            >
              <X className="size-[18px]" />
            </button>
          </div>
        )
      })}

      {adding && (
        <div className="flex flex-col gap-2.5 rounded-[18px] bg-background p-3">
          {free.length === 0 ? (
            <span className="text-[13px] text-muted-foreground">추가할 직원이 없어요</span>
          ) : (
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="직원">
              {free.map((p) => (
                <button
                  key={p.memberId}
                  type="button"
                  role="radio"
                  aria-checked={who === p.memberId}
                  onClick={() => setWho(p.memberId)}
                  className={cn(
                    'rounded-full border px-3.5 py-2 text-[13px] font-bold',
                    who === p.memberId
                      ? 'border-brand bg-brand text-white'
                      : 'border-muted bg-white text-foreground',
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <TimeInput label="시작" value={start} onChange={setStart} />
            <span className="text-muted-foreground">–</span>
            <TimeInput label="종료" value={end} onChange={setEnd} />
          </div>
          {!timeOk && (
            <span className="text-[13px] text-destructive-foreground">
              시간은 09:00처럼 적고, 끝나는 시간은 시작 뒤로 해 주세요
            </span>
          )}
          <Button className="h-12" disabled={!who || !timeOk || add.isPending} onClick={submit}>
            근무 추가
          </Button>
        </div>
      )}

      <div className="mt-1 flex flex-col gap-1.5">
        <span className="px-0.5 text-[13px] font-bold text-[#6B7068]">메모</span>
        <Textarea
          value={memoText}
          onChange={(event) => setMemoText(event.target.value)}
          onBlur={() => {
            if (memoText === memo) return
            saveMemo.mutate(
              { date, text: memoText },
              { onError: (error) => toastApiError(error, '메모를 저장하지 못했어요') },
            )
          }}
          placeholder="이 날 메모"
          aria-label="이 날 메모"
          className="min-h-[72px] rounded-[18px] bg-background px-3.5 py-3 text-sm"
        />
      </div>
    </section>
  )
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      inputMode="numeric"
      className="h-11 min-w-0 flex-1 rounded-[14px] border-none bg-white text-center text-[15px] font-bold"
    />
  )
}
