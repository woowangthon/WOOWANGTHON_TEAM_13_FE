import { Check, ChevronRight, Clock, Minus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { handoverDays } from '@/api/mocks/staff/handovers'
import { sameDay, type StaffStore } from '@/api/mocks/staff/stores'
import { formatDate } from '@/lib/format'
import { HANDOVER_TAG_COLOR } from '@/pages/staff/components/icons'
import { useStaffStore } from '@/pages/staff/staffStore'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { Card } from '@/ui/Card'
import { EmptyState } from '@/ui/EmptyState'
import { cn } from '@/ui/utils'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 알바 홈: 이번 주 · 오늘 근무 · 오늘의 인수인계
export function StaffHome() {
  const { store } = useCurrentStore()
  // 매장을 바꾸면 선택한 날짜를 그 매장의 오늘로 되돌린다
  return <HomeBody key={store.id} store={store} />
}

function HomeBody({ store }: { store: StaffStore }) {
  const todayDate = store.today.getDate()
  const [selected, setSelected] = useState(todayDate)

  return (
    <div className="flex flex-col gap-[18px]">
      <span className="px-1 text-[13px] font-medium text-muted-foreground">
        {formatDate(store.today)}
      </span>

      <div className="grid grid-cols-7 items-center gap-1">
        {store.week.map(({ date, work }) => {
          const day = date.getDate()
          const on = day === selected
          const today = sameDay(date, store.today)
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelected(day)}
              aria-pressed={on}
              className={cn(
                'flex flex-col items-center gap-[5px] rounded-full transition-colors',
                on ? 'bg-brand pt-3.5 pb-3 text-white shadow-lift' : 'py-2',
                !on && (today ? 'text-brand' : work ? 'text-foreground' : 'text-faint'),
              )}
            >
              <span className="text-[11px] font-medium opacity-70">{WEEKDAYS[date.getDay()]}</span>
              <span className="text-[17px] font-bold">{day}</span>
              <span
                className={cn(
                  'size-[5px] rounded-full',
                  work ? (on ? 'bg-white' : 'bg-brand') : 'bg-transparent',
                )}
              />
            </button>
          )
        })}
      </div>

      <TodayShiftCard store={store} />

      <HandoverSection store={store} selectedDay={selected} />
    </div>
  )
}

function TodayShiftCard({ store }: { store: StaffStore }) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const showPhoto = store.photo && !photoFailed

  return (
    <section className="relative isolate min-h-[240px] overflow-hidden rounded-[30px] bg-brand texture">
      {showPhoto && (
        <img
          src={store.photo}
          alt=""
          onError={() => setPhotoFailed(true)}
          className="absolute inset-0 -z-10 size-full object-cover"
        />
      )}
      {showPhoto && (
        <div className="pointer-events-none absolute inset-0" style={{ background: store.scrim }} />
      )}
      <div className="relative flex min-h-[240px] flex-col justify-between gap-[18px] p-5 text-white">
        <span className="flex items-center gap-2 self-start rounded-full bg-white/15 py-[5px] pr-[13px] pl-[5px] text-[13px] font-bold whitespace-nowrap backdrop-blur-md">
          <span className="flex size-7 items-center justify-center rounded-full bg-white text-brand">
            <Clock className="size-4" strokeWidth={2.4} />
          </span>
          오늘 근무 · {store.shift.role}
        </span>
        <div className="flex items-end justify-between gap-3.5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[32px] leading-[1.1] font-extrabold tracking-[-0.03em]">
              {store.shift.start} – {store.shift.end}
            </span>
            <span className="text-[13px] break-keep opacity-85">{store.crew}</span>
          </div>
          <Link
            to="/staff/schedule"
            aria-label="근무 보기"
            className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-white text-foreground"
          >
            <ChevronRight className="size-6" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function HandoverSection({ store, selectedDay }: { store: StaffStore; selectedDay: number }) {
  const checked = useStaffStore((state) => state.checkedHandovers)
  const toggle = useStaffStore((state) => state.toggleHandover)

  const todayDate = store.today.getDate()
  const live = selectedDay === todayDate
  const day = handoverDays[store.id]?.[selectedDay]
  const items = day?.items ?? []
  const doneCount = live ? items.filter((item) => checked[item.id]).length : items.length
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0
  const selectedDate = store.week.find((w) => w.date.getDate() === selectedDay)?.date

  const title = live
    ? '오늘의 인수인계'
    : `${selectedDate ? formatDate(selectedDate) : `${selectedDay}일`} 인수인계`

  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-baseline justify-between gap-2.5 px-1">
        <h2 className="m-0 text-xl font-extrabold tracking-[-0.02em]">{title}</h2>
        {live && (
          <Link
            to="/staff/handover"
            className="p-1 text-[13px] font-semibold whitespace-nowrap text-[#4F554D]"
          >
            남기기
          </Link>
        )}
      </div>

      {items.length > 0 && day ? (
        <div className="flex flex-col gap-2.5">
          <Card variant="dark" className="gap-2.5 px-[22px] py-5">
            <div className="flex items-center justify-between gap-2.5">
              <span className="text-lg font-extrabold">AI 요약</span>
              <span className="text-[13px] font-semibold whitespace-nowrap opacity-80">
                {day.from}
              </span>
            </div>
            <p className="m-0 text-sm leading-[1.65] break-keep opacity-90">{day.summary}</p>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-xs font-bold whitespace-nowrap">
                {doneCount} / {items.length} 처리
              </span>
            </div>
          </Card>

          {items.map((item) => {
            const done = live ? !!checked[item.id] : true
            const faded = live && done
            return (
              <button
                key={item.id}
                type="button"
                disabled={!live}
                onClick={() => toggle(item.id)}
                aria-pressed={done}
                className={cn(
                  'flex items-center gap-3.5 rounded-[20px] bg-card p-4 text-left shadow-soft disabled:cursor-default',
                  faded && 'opacity-50',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-[7px] border-[1.5px] text-white',
                    done ? 'border-brand bg-brand' : 'border-line bg-transparent',
                  )}
                >
                  {done && <Check className="size-4" strokeWidth={3} />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span
                    className={cn(
                      'text-[15px] leading-[1.4] font-semibold break-keep',
                      faded && 'line-through',
                    )}
                  >
                    {item.text}
                  </span>
                  <span className="text-xs text-subtle">
                    {live ? item.tag : `${item.tag} · 처리됨`}
                  </span>
                </span>
                <span
                  className="size-[7px] shrink-0 rounded-full"
                  style={{ background: faded ? '#CFC8BA' : HANDOVER_TAG_COLOR[item.tag] }}
                />
              </button>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={selectedDay > todayDate ? Clock : day ? Check : Minus}
          message={
            selectedDay > todayDate ? '아직 기록 전이에요' : day ? '특이사항 없음' : '기록 없음'
          }
        />
      )}
    </section>
  )
}
