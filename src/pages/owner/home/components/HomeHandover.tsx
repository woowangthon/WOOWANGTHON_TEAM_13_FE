import { Check, Clock, Minus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useConfirmHandoverItem, useHandoverNotes } from '@/lib/api/handover'
import { fromDateKey, isSameDay, toDateKey } from '@/lib/date'
import { formatDate, formatTime } from '@/lib/format'
import type { HandoverNote } from '@/lib/api/types'
import { HandoverList } from '@/shared/handover/HandoverList'
import { LoadError } from '@/shared/LoadError'
import { EmptyState } from '@/ui/EmptyState'
import { Spinner } from '@/ui/Spinner'
import { cn } from '@/ui/utils'

// 사장님 홈 · 인수인계: 이번 주 날짜 → 그날 AI 요약 + 항목 체크 (오늘만 체크)
// 데이터는 알바 화면과 같은 인수인계 훅 (lib/api/handover)

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function weekOf(today: Date) {
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return date
  })
}

export function HomeHandover({ storeId, today }: { storeId: string; today: Date }) {
  const [selected, setSelected] = useState(toDateKey(today))
  const date = fromDateKey(selected)
  const live = isSameDay(date, today)
  const notesQuery = useHandoverNotes(storeId, selected)
  const confirm = useConfirmHandoverItem(storeId, selected)

  const notes = notesQuery.data?.notes ?? []
  const items = notes.flatMap((note) => note.items)
  const done = live ? items.filter((item) => item.checked).length : items.length

  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-baseline justify-between gap-2.5 px-1">
        <h2 className="m-0 text-xl font-extrabold tracking-[-0.02em]">
          {live ? '오늘의 인수인계' : `${formatDate(date)} 인수인계`}
        </h2>
        {items.length > 0 && (
          <span className="text-[13px] font-semibold whitespace-nowrap text-[#4F554D]">
            {done} / {items.length}
          </span>
        )}
      </div>

      <div className="grid grid-cols-7 items-center gap-1">
        {weekOf(today).map((day) => (
          <WeekDay
            key={toDateKey(day)}
            storeId={storeId}
            day={day}
            today={today}
            selected={toDateKey(day) === selected}
            onSelect={() => setSelected(toDateKey(day))}
          />
        ))}
      </div>

      {notesQuery.isPending ? (
        <Spinner />
      ) : notesQuery.error ? (
        <LoadError error={notesQuery.error} onRetry={() => notesQuery.refetch()} />
      ) : items.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {notes
            .filter((note) => note.items.length > 0)
            .map((note) => (
              <div key={note.noteId} className="flex flex-col gap-2.5">
                <SummaryCard note={note} />
                <HandoverList
                  items={note.items}
                  live={live}
                  onToggle={(item) =>
                    confirm.mutate({
                      noteId: note.noteId,
                      itemId: item.itemId,
                      checked: !item.checked,
                    })
                  }
                />
              </div>
            ))}
        </div>
      ) : (
        <EmptyState
          icon={date > today ? Clock : notes.length > 0 ? Check : Minus}
          message={
            date > today ? '아직 기록 전이에요' : notes.length > 0 ? '특이사항 없음' : '기록 없음'
          }
        />
      )}
    </section>
  )
}

/** 날짜 버튼 (그날 인수인계가 있으면 점) */
function WeekDay({
  storeId,
  day,
  today,
  selected,
  onSelect,
}: {
  storeId: string
  day: Date
  today: Date
  selected: boolean
  onSelect: () => void
}) {
  const future = day > today
  const notes = useHandoverNotes(storeId, toDateKey(day))
  const has = !future && (notes.data?.notes.length ?? 0) > 0
  const isToday = isSameDay(day, today)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${formatDate(day)} 인수인계`}
      className={cn(
        'flex flex-col items-center gap-[5px] rounded-full transition-colors',
        selected ? 'bg-brand pt-3.5 pb-3 text-white shadow-lift' : 'py-2',
        !selected && (isToday ? 'text-brand' : future ? 'text-faint' : 'text-foreground'),
      )}
    >
      <span className="text-[11px] font-medium opacity-70">{WEEKDAYS[day.getDay()]}</span>
      <span className="text-[17px] font-bold">{day.getDate()}</span>
      <span
        className={cn(
          'size-[5px] rounded-full',
          has ? (selected ? 'bg-white' : 'bg-brand') : 'bg-transparent',
        )}
      />
    </button>
  )
}

/** 사장님 홈 AI 요약: 연한 매장 색 카드 (알바 홈은 진한 카드) */
function SummaryCard({ note }: { note: HandoverNote }) {
  return (
    <div className="flex flex-col gap-2 rounded-[24px] bg-brand-soft px-5 py-[18px]">
      <div className="flex items-center justify-between gap-2.5">
        <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-brand">
          <Sparkles className="size-[17px]" fill="currentColor" />
          AI 요약
        </span>
        <span className="shrink-0 text-xs font-semibold whitespace-nowrap text-[#4F6A5A]">
          {note.author.name} · {formatTime(note.createdAt)}
        </span>
      </div>
      <p className="m-0 text-[15px] leading-[1.55] font-semibold break-keep text-[#22362B]">
        {note.summary}
      </p>
    </div>
  )
}
