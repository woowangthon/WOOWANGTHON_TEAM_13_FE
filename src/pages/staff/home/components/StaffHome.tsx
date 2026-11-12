import { Check, ChevronRight, Clock, Minus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  dayHandoverSummary,
  useConfirmHandoverItem,
  useHandoverDaySummary,
  useHandoverNotes,
} from '@/lib/api/handover'
import { availabilityEnabled, shiftLabel, useMySchedule } from '@/lib/api/schedule'
import { isRealApi } from '@/lib/api/source'
import { useScheduleWorkers } from '@/lib/api/substitute'
import type { Shift, UserRef } from '@/lib/api/types'
import { addDays, fromDateKey, isSameDay, todayInKst, toDateKey } from '@/lib/date'
import { formatDate, formatTime } from '@/lib/format'
import { ShiftBanner } from '@/pages/staff/home/components/ShiftBanner'
import { ReceivedSubstituteBanner } from '@/pages/staff/schedule/components/SubstituteRequests'
import { useCurrentStore, type StaffStoreView } from '@/pages/staff/useCurrentStore'
import { EmptyGuide } from '@/shared/EmptyGuide'
import { LoadError } from '@/shared/LoadError'
import { AiSummaryCard } from '@/shared/handover/AiSummaryCard'
import { HandoverList } from '@/shared/handover/HandoverList'
import { PRESSABLE } from '@/shared/pressable'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { Spinner } from '@/ui/Spinner'
import { cn } from '@/ui/utils'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 이번 주 7일 + 근무 있는 날 */
type WeekDay = { date: Date; work: boolean }

// 알바 홈: 이번 주 · 오늘 근무 · 오늘의 인수인계 (근무: useMySchedule)
export function StaffHome() {
  const { store } = useCurrentStore()
  const scheduleQuery = useMySchedule(store.id)
  const schedule = scheduleQuery.data
  if (scheduleQuery.isError) {
    return (
      <LoadError
        what="근무를"
        error={scheduleQuery.error}
        onRetry={() => scheduleQuery.refetch()}
      />
    )
  }
  if (!schedule) return <Spinner />

  // 인수인계가 진짜 API면 BE 는 실제 오늘(KST)로 저장한다 → 근무표가 아직 가짜(11/20)여도 홈은 실제 오늘 기준.
  // 가짜 서버일 땐 시연 날짜 그대로. 주 시작 요일은 근무표를 따른다
  const scheduleToday = fromDateKey(schedule.today)
  const scheduleWeekStart = fromDateKey(schedule.weekStart)
  const realToday = isRealApi('handover') ? todayInKst() : null
  const today = realToday ?? scheduleToday
  const weekStart = realToday
    ? addDays(realToday, -((realToday.getDay() - scheduleWeekStart.getDay() + 7) % 7))
    : scheduleWeekStart
  const workDays = new Set(schedule.shifts.map((shift) => shift.date))
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)
    return { date, work: workDays.has(toDateKey(date)) }
  })
  const todayShift = schedule.shifts.find((shift) => shift.date === toDateKey(today))

  // 매장을 바꾸면 선택한 날짜를 그 매장의 오늘로 되돌린다
  return <HomeBody key={store.id} store={store} today={today} week={week} todayShift={todayShift} />
}

function HomeBody({
  store,
  today: todayOfStore,
  week,
  todayShift,
}: {
  store: StaffStoreView
  today: Date
  week: WeekDay[]
  todayShift?: Shift
}) {
  const navigate = useNavigate()
  const todayDate = todayOfStore.getDate()
  const [selected, setSelected] = useState(todayDate)

  return (
    <div className="flex flex-col gap-[18px]">
      <ShiftBanner storeId={store.id} today={todayOfStore} />
      <ReceivedSubstituteBanner storeId={store.id} />
      <span className="px-1 text-[13px] font-medium text-muted-foreground">
        {formatDate(todayOfStore)}
      </span>

      <div className="grid grid-cols-7 items-center gap-1">
        {week.map(({ date, work }) => {
          const day = date.getDate()
          const on = day === selected
          const today = isSameDay(date, todayOfStore)
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
              <span className="text-[17px] font-bold tabular-nums">{day}</span>
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

      {todayShift ? (
        <TodayShiftCard store={store} shift={todayShift} />
      ) : week.some((d) => d.work) ? (
        <EmptyGuide
          message="오늘은 근무가 없어요"
          action={
            <Button size="md" className="h-[46px] px-5" onClick={() => navigate('/staff/schedule')}>
              근무표 보기
            </Button>
          }
        />
      ) : (
        <EmptyGuide
          message="아직 정해진 근무가 없어요"
          action={
            // 근무 가능 시간은 BE 에서 없어져서 진짜 모드면 전체 근무표로
            availabilityEnabled() ? (
              <Button
                size="md"
                className="h-[46px] px-5"
                onClick={() => navigate('/staff/availability')}
              >
                가능 시간 내기
              </Button>
            ) : (
              <Button
                size="md"
                className="h-[46px] px-5"
                onClick={() => navigate('/staff/schedule')}
              >
                근무표 보기
              </Button>
            )
          }
        />
      )}

      <HandoverSection store={store} today={todayOfStore} week={week} selectedDay={selected} />
    </div>
  )
}

function TodayShiftCard({ store, shift }: { store: StaffStoreView; shift: Shift }) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const showPhoto = store.photo && !photoFailed

  return (
    <Link
      to="/staff/schedule"
      aria-label={`오늘 근무 ${shift.start} – ${shift.end} · 근무 보기`}
      className={cn(
        'relative isolate block min-h-[240px] overflow-hidden rounded-[30px] bg-brand texture',
        PRESSABLE,
      )}
    >
      {showPhoto && (
        <img
          src={store.photo}
          alt=""
          onError={() => setPhotoFailed(true)}
          className="absolute inset-0 -z-10 size-full object-cover"
        />
      )}
      {showPhoto && (
        // 아래쪽만 옅게 어둡게 (근무 시간 · 같이 일하는 사람 흰 글씨), 위쪽 절반은 사진 그대로
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: store.photoShade }}
        />
      )}
      <div className="relative flex min-h-[240px] flex-col justify-between gap-[18px] p-5 text-white">
        {/* 사진 위에서는 사장님 홈 매장 카드처럼 검정 반투명, 사진이 없으면 매장 색 위 흰 반투명 */}
        <span
          className={cn(
            'flex items-center gap-2 self-start rounded-full py-[5px] pr-[13px] pl-[5px] text-[13px] font-bold whitespace-nowrap backdrop-blur-md',
            showPhoto ? 'bg-black/35' : 'bg-white/15',
          )}
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-white text-brand">
            <Clock className="size-4" strokeWidth={2.4} />
          </span>
          오늘 근무 · {shiftLabel(shift)}
        </span>
        <div className="flex items-end justify-between gap-3.5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[32px] leading-[1.1] font-extrabold tracking-[-0.03em] tabular-nums">
              {shift.start} – {shift.end}
            </span>
            <span className="text-[13px] text-balance break-keep opacity-85">
              {shift.crew.join(' · ')}
            </span>
          </div>
          <span
            aria-hidden="true"
            className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-white text-foreground"
          >
            <ChevronRight className="size-6" />
          </span>
        </div>
      </div>
    </Link>
  )
}

/**
 * 작성자 이름: 노트의 author.name 은 프로필 이름(예: 류민지)이라, 매장 직원 이름(예: 하늘)을 근무표 사람 목록에서 찾는다.
 * 못 찾으면(목록을 아직 못 받았거나 나간 사람) author.name. 사장님은 목록 이름 그대로
 */
function useStaffName(storeId: string) {
  const workers = useScheduleWorkers(storeId).data?.workers
  return (author: UserRef) => workers?.find((w) => w.userId === author.userId)?.name ?? author.name
}

// 하루 AI 요약 카드 1개 + 그날 모든 항목 한 목록 (노트 순서 · 항목 순서). 항목 오른쪽에 작성자 · 시간. 오늘만 체크할 수 있다
function HandoverSection({
  store,
  today,
  week,
  selectedDay,
}: {
  store: StaffStoreView
  today: Date
  week: WeekDay[]
  selectedDay: number
}) {
  const todayDate = today.getDate()
  const live = selectedDay === todayDate
  const selectedDate =
    week.find((w) => w.date.getDate() === selectedDay)?.date ??
    new Date(today.getFullYear(), today.getMonth(), selectedDay)
  const date = toDateKey(selectedDate)
  const navigate = useNavigate()
  const notesQuery = useHandoverNotes(store.id, date)
  const confirm = useConfirmHandoverItem(store.id, date)

  const notes = notesQuery.data?.notes ?? []
  const withItems = notes.filter((note) => !note.noIssue && note.items.length > 0)
  // 노트 구분 없이 한 목록 (노트 순서 · 항목 순서 그대로). 체크할 때 쓸 noteId 와 항목 오른쪽 "작성자 · 시간"
  const items = withItems.flatMap((note) => note.items)
  const noteOf = new Map(withItems.flatMap((note) => note.items.map((item) => [item.itemId, note])))
  const authorName = useStaffName(store.id)
  const authors = new Set(withItems.map((note) => note.author.userId)).size

  // 카드 본문: BE 하루 AI 요약이 있으면 그것, 불러오는 중 · 실패(토스트 없음) · null 이면 노트 요약을 한 줄씩 모은 것.
  // 요약이 지금 노트보다 적은 노트로 만든 것이면(다른 사람이 막 남김) 노트 요약을 보여 주고 요약을 다시 부른다
  const daySummary = useHandoverDaySummary(store.id, date)
  const ai = daySummary.data
  const notesLoaded = notesQuery.isSuccess
  const aiIsCurrent = !!ai && notesLoaded && ai.noteCount === notes.length
  const { refetch: refetchDaySummary } = daySummary
  useEffect(() => {
    if (ai && notesLoaded && ai.noteCount !== notes.length) void refetchDaySummary()
  }, [ai, notesLoaded, notes.length, refetchDaySummary])
  const summary = (aiIsCurrent && ai.summary?.trim()) || dayHandoverSummary(withItems)

  const title = live ? '오늘의 인수인계' : `${formatDate(selectedDate)} 인수인계`

  return (
    <section id="today-handover" className="flex scroll-mt-20 flex-col gap-3.5">
      <div className="flex items-baseline justify-between gap-2.5 px-1">
        <h2 className="m-0 text-xl font-extrabold tracking-[-0.02em]">{title}</h2>
        {live && (
          <Link
            to="/staff/handover"
            className="p-1 text-[13px] font-semibold whitespace-nowrap text-foreground"
          >
            남기기
          </Link>
        )}
      </div>

      {notesQuery.isPending ? (
        <Spinner />
      ) : notesQuery.isError ? (
        <LoadError
          what="인수인계를"
          error={notesQuery.error}
          onRetry={() => notesQuery.refetch()}
        />
      ) : withItems.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          <AiSummaryCard
            from={`${authors}명이 남김`}
            summary={summary}
            done={live ? items.filter((item) => item.checked).length : items.length}
            total={items.length}
          />
          <HandoverList
            items={items}
            live={live}
            meta={(item) => {
              const note = noteOf.get(item.itemId)
              return note && `${authorName(note.author)} · ${formatTime(note.createdAt)}`
            }}
            onToggle={(item) => {
              const note = noteOf.get(item.itemId)
              if (note) {
                confirm.mutate({ noteId: note.noteId, itemId: item.itemId, checked: !item.checked })
              }
            }}
          />
        </div>
      ) : live && notes.length === 0 ? (
        <EmptyGuide
          message="오늘 남긴 인수인계가 없어요"
          action={
            <Button
              size="md"
              className="h-[46px] px-5"
              onClick={() => navigate('/staff/handover', { preventScrollReset: true })}
            >
              인수인계 남기기
            </Button>
          }
        />
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
