import { Check, ChevronRight, Clock, Minus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toDateParam, useConfirmHandoverItem, useHandoverNotes } from '@/lib/api/handover'
import { formatDate, formatTime } from '@/lib/format'
import { useCurrentStore, type StaffStoreView } from '@/pages/staff/useCurrentStore'
import { AiSummaryCard } from '@/shared/handover/AiSummaryCard'
import { HandoverList } from '@/shared/handover/HandoverList'
import { EmptyState } from '@/ui/EmptyState'
import { Spinner } from '@/ui/Spinner'
import { cn } from '@/ui/utils'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

// 알바 홈: 이번 주 · 오늘 근무 · 오늘의 인수인계
export function StaffHome() {
  const { store } = useCurrentStore()
  // 매장을 바꾸면 선택한 날짜를 그 매장의 오늘로 되돌린다
  return <HomeBody key={store.id} store={store} />
}

function HomeBody({ store }: { store: StaffStoreView }) {
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

function TodayShiftCard({ store }: { store: StaffStoreView }) {
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

// 노트마다 AI 요약 카드 + 항목 (최신 순). 오늘만 체크할 수 있다
function HandoverSection({ store, selectedDay }: { store: StaffStoreView; selectedDay: number }) {
  const todayDate = store.today.getDate()
  const live = selectedDay === todayDate
  const selectedDate =
    store.week.find((w) => w.date.getDate() === selectedDay)?.date ??
    new Date(store.today.getFullYear(), store.today.getMonth(), selectedDay)
  const date = toDateParam(selectedDate)
  const notesQuery = useHandoverNotes(store.id, date)
  const confirm = useConfirmHandoverItem(store.id, date)

  const notes = notesQuery.data?.notes ?? []
  const withItems = notes.filter((note) => !note.noIssue && note.items.length > 0)

  const title = live ? '오늘의 인수인계' : `${formatDate(selectedDate)} 인수인계`

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

      {notesQuery.isPending ? (
        <Spinner />
      ) : withItems.length > 0 ? (
        withItems.map((note) => (
          <div key={note.noteId} className="flex flex-col gap-2.5">
            <AiSummaryCard
              from={`${note.author.name} · ${formatTime(note.createdAt)}`}
              summary={note.summary}
              done={live ? note.items.filter((item) => item.checked).length : note.items.length}
              total={note.items.length}
            />
            <HandoverList
              items={note.items}
              live={live}
              onToggle={(item) =>
                confirm.mutate({ noteId: note.noteId, itemId: item.itemId, checked: !item.checked })
              }
            />
          </div>
        ))
      ) : (
        <EmptyState
          icon={selectedDay > todayDate ? Clock : notes.length > 0 ? Check : Minus}
          message={
            selectedDay > todayDate
              ? '아직 기록 전이에요'
              : notes.length > 0
                ? '특이사항 없음'
                : '기록 없음'
          }
        />
      )}
    </section>
  )
}
