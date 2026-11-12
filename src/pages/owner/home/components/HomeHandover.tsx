import { Check, Clock, Minus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { dayHandoverSummary, useConfirmHandoverItem, useHandoverNotes } from '@/lib/api/handover'
import { fromDateKey, isSameDay, toDateKey } from '@/lib/date'
import { formatDate, formatTime } from '@/lib/format'
import { useScheduleWorkers } from '@/pages/owner/api/fixedSchedule'
import { useHandoverDaySummary } from '@/pages/owner/api/home'
import { HandoverList } from '@/shared/handover/HandoverList'
import { LoadError } from '@/shared/LoadError'
import { EmptyState } from '@/ui/EmptyState'
import { Spinner } from '@/ui/Spinner'
import { cn } from '@/ui/utils'

// 사장님 홈 · 인수인계: 이번 주 날짜 → 그날 AI 요약 카드 1개 + 그날 모든 항목 한 목록 (오늘만 체크)
// 요약은 BE 하루 AI 요약(BE #41), 없거나 실패하면 노트 요약을 이어 붙인다. 항목 오른쪽에 작성자 · 시간 (알바 홈과 같은 방식, 11/12)
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
  const withItems = notes.filter((note) => !note.noIssue && note.items.length > 0)
  // 노트 구분 없이 한 목록 (노트 순서 · 항목 순서 그대로). 체크할 때 쓸 noteId 와 "작성자 · 시간"
  const items = withItems.flatMap((note) => note.items)
  const noteOf = new Map(withItems.flatMap((note) => note.items.map((item) => [item.itemId, note])))
  const done = live ? items.filter((item) => item.checked).length : items.length
  const workers = useScheduleWorkers(storeId).data
  const nameOf = (userId: string, fallback: string) =>
    workers?.find((w) => w.userId === userId)?.name ?? fallback
  const authors = new Set(withItems.map((note) => note.author.userId)).size
  const aiSummary = useHandoverDaySummary(
    storeId,
    selected,
    withItems.map((note) => note.noteId).join(','),
  ).data

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
          <SummaryCard
            from={`${authors}명이 남김`}
            summary={aiSummary ?? dayHandoverSummary(withItems)}
          />
          <HandoverList
            items={items}
            live={live}
            meta={(item) => {
              const note = noteOf.get(item.itemId)
              return (
                note &&
                `${nameOf(note.author.userId, note.author.name)} · ${formatTime(note.createdAt)}`
              )
            }}
            onToggle={(item) => {
              const note = noteOf.get(item.itemId)
              if (note) {
                confirm.mutate({ noteId: note.noteId, itemId: item.itemId, checked: !item.checked })
              }
            }}
          />
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

/** 사장님 홈 하루 AI 요약: 연한 매장 색 카드 (알바 홈은 진한 카드). 줄바꿈은 줄마다 */
function SummaryCard({ from, summary }: { from: string; summary: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-[24px] bg-brand-soft px-5 py-[18px]">
      <div className="flex items-center justify-between gap-2.5">
        <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-brand">
          <Sparkles className="size-[17px]" fill="currentColor" />
          AI 요약
        </span>
        <span className="shrink-0 text-xs font-semibold whitespace-nowrap text-[#4F6A5A]">
          {from}
        </span>
      </div>
      <p className="m-0 text-[15px] leading-[1.55] font-semibold whitespace-pre-line break-keep text-[#22362B]">
        {summary}
      </p>
    </div>
  )
}
