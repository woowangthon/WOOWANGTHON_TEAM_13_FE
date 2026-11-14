import { Check, Clock, Minus } from 'lucide-react'
import { useState } from 'react'
import { dayHandoverSummary, useConfirmHandoverItem, useHandoverNotes } from '@/lib/api/handover'
import { fromDateKey, isSameDay, toDateKey } from '@/lib/date'
import { formatDate, formatTime } from '@/lib/format'
import { useScheduleWorkers } from '@/pages/owner/api/fixedSchedule'
import { useHandoverDaySummary } from '@/pages/owner/api/home'
import { AiSummaryCard } from '@/shared/handover/AiSummaryCard'
import { HandoverList } from '@/shared/handover/HandoverList'
import { LoadError } from '@/shared/LoadError'
import { WeekNav } from '@/shared/WeekNav'
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
  // 보고 있는 주 (0 = 이번 주). ‹ › 로 한 주씩, 같은 요일을 골라 둔다 · [이번 주로]는 오늘로 (민지 shared/WeekNav)
  const [weekOffset, setWeekOffset] = useState(0)
  const moveWeek = (step: number) => {
    setWeekOffset((offset) => offset + step)
    setSelected((key) => {
      const next = fromDateKey(key)
      next.setDate(next.getDate() + step * 7)
      return toDateKey(next)
    })
  }
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
    // id: 출근 전 배너 [인수인계 보기]가 여기로 내려온다
    <section id="today-handover" className="flex scroll-mt-20 flex-col gap-3.5">
      <div className="flex items-baseline justify-between gap-2.5 px-1">
        <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">
          {live ? '오늘의 인수인계' : `${formatDate(date)} 인수인계`}
        </h2>
      </div>

      <WeekNav
        thisWeek={weekOffset === 0}
        onMove={moveWeek}
        onThisWeek={() => {
          setWeekOffset(0)
          setSelected(toDateKey(today))
        }}
      >
        <div className="grid grid-cols-7 items-center gap-0.5">
          {weekOf(
            new Date(today.getFullYear(), today.getMonth(), today.getDate() + weekOffset * 7),
          ).map((day) => (
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
      </WeekNav>

      {notesQuery.isPending ? (
        <Spinner />
      ) : notesQuery.error ? (
        <LoadError error={notesQuery.error} onRetry={() => notesQuery.refetch()} />
      ) : items.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {/* 처리 진행은 제목 옆 숫자 대신 AI 요약 카드 아래 막대로 (알바 홈과 같은 공용 카드, 11/14) */}
          <AiSummaryCard
            from={`${authors}명이 남김`}
            summary={aiSummary ?? dayHandoverSummary(withItems)}
            done={done}
            total={items.length}
          />
          {/* 카드 한 장 안의 할 일 목록 (알바 홈과 같은 모양, 민지 #108) */}
          <HandoverList
            variant="list"
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
      <span className="text-[16px] font-bold">{day.getDate()}</span>
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
