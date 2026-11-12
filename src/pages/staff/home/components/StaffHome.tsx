import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  dayHandoverSummary,
  useConfirmHandoverItem,
  useHandoverDaySummary,
  useHandoverNotes,
} from '@/lib/api/handover'
import {
  availabilityEnabled,
  myUserId,
  shiftLabel,
  useMySchedule,
  useScheduleCalendar,
} from '@/lib/api/schedule'
import { daysUntil, payDateOf, useMyPayrollEstimate } from '@/lib/api/payroll'
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
import { SectionHeader } from '@/shared/SectionHeader'
import { useReveal, useRevealChildren } from '@/shared/useReveal'
import { WeekNav } from '@/shared/WeekNav'
import { Skeleton, SkeletonGroup } from '@/shared/Skeleton'
import { Button } from '@/ui/Button'
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
  if (!schedule) return <HomeSkeleton />

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
  // 인수인계 볼 날짜 · 보고 있는 주 (0 = 오늘이 있는 주, ‹ › 로 한 주씩)
  const [selectedKey, setSelectedKey] = useState(toDateKey(todayOfStore))
  const [weekOffset, setWeekOffset] = useState(0)
  const shownStart = addDays(week[0].date, weekOffset * 7)
  // 다른 주의 근무 점: 그 주 공유 근무 달력에서 내 근무만 (이번 주는 이미 받은 useMySchedule 그대로)
  const otherWeek = useScheduleCalendar(
    store.id,
    toDateKey(shownStart),
    toDateKey(addDays(shownStart, 6)),
    weekOffset !== 0,
  ).data
  const me = myUserId()
  const shownWeek: WeekDay[] =
    weekOffset === 0
      ? week
      : Array.from({ length: 7 }, (_, i) => {
          const date = addDays(shownStart, i)
          const key = toDateKey(date)
          return {
            date,
            work: !!otherWeek?.shifts.some((s) => s.date === key && s.assignee.userId === me),
          }
        })
  // 주를 옮기면 같은 요일을 골라 둔다. [이번 주로]는 오늘로
  const moveWeek = (step: number) => {
    setWeekOffset((offset) => offset + step)
    setSelectedKey((key) => toDateKey(addDays(fromDateKey(key), step * 7)))
  }
  const backToThisWeek = () => {
    setWeekOffset(0)
    setSelectedKey(toDateKey(todayOfStore))
  }
  // 스크롤해서 처음 보일 때 살짝 떠오르기 (첫 화면에 보이는 것은 그대로 — shared/useReveal)
  const todayRef = useReveal<HTMLElement>()

  // 배치 (docs/08): 알림 배너 → 오늘(날짜 제목 + 오늘 근무) → 인수인계. 섹션 사이 32px · 섹션 안 12px.
  // 진한 덩어리는 오늘 근무 사진 카드 하나 (배너 · AI 요약은 옅은 바탕)
  return (
    <div className="flex flex-col gap-8">
      {/* 출근 전 · 받은 대타 배너 (둘 다 없으면 이 칸도 없음) */}
      <div className="flex flex-col gap-2 empty:hidden">
        <ShiftBanner storeId={store.id} today={todayOfStore} />
        <ReceivedSubstituteBanner storeId={store.id} />
      </div>

      <section ref={todayRef} aria-labelledby="home-today" className="flex flex-col gap-3">
        <h1
          id="home-today"
          className="m-0 px-1 text-[26px] leading-[1.25] font-extrabold tracking-[-0.03em] tabular-nums"
        >
          {formatDate(todayOfStore)}
        </h1>
        {todayShift ? (
          <TodayShiftCard store={store} shift={todayShift} today={todayOfStore} />
        ) : week.some((d) => d.work) ? (
          <EmptyGuide
            message="오늘은 근무가 없어요"
            action={
              <Button size="md" variant="soft" onClick={() => navigate('/staff/schedule')}>
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
                <Button size="md" onClick={() => navigate('/staff/availability')}>
                  가능 시간 내기
                </Button>
              ) : (
                <Button size="md" variant="soft" onClick={() => navigate('/staff/schedule')}>
                  근무표 보기
                </Button>
              )
            }
          />
        )}
      </section>

      {/* 요일 줄은 인수인계 볼 날짜만 바꿔서 인수인계 섹션 맨 위에 */}
      <HandoverSection
        store={store}
        today={todayOfStore}
        week={shownWeek}
        selectedDate={fromDateKey(selectedKey)}
        onSelectDate={(date) => setSelectedKey(toDateKey(date))}
        weekNav={{ thisWeek: weekOffset === 0, onMove: moveWeek, onThisWeek: backToThisWeek }}
      />
    </div>
  )
}

/** 요일 줄 (월~일, ‹ › 로 다른 주): 고른 날 · 오늘 · 근무 있는 날 점. 누르면 그날 인수인계를 본다 */
function WeekStrip({
  week,
  today: todayOfStore,
  selected,
  onSelect,
}: {
  week: WeekDay[]
  today: Date
  selected: Date
  onSelect: (date: Date) => void
}) {
  return (
    // 양옆 ‹ › 32px 가 들어가도록 칸 사이 2px (360px 에서 칸 33px)
    <div className="grid grid-cols-7 gap-0.5">
      {week.map(({ date, work }) => {
        const day = date.getDate()
        const on = isSameDay(date, selected)
        const today = isSameDay(date, todayOfStore)
        return (
          <button
            key={toDateKey(date)}
            type="button"
            onClick={() => onSelect(date)}
            aria-pressed={on}
            className={cn(
              // 고른 날만 매장 색 알약 (그림자 없음). 오늘은 매장 색 글자, 근무 없는 날은 연한 회색
              'flex flex-col items-center gap-1 rounded-full py-2.5 transition-colors duration-150 motion-reduce:transition-none',
              on
                ? 'bg-brand text-white'
                : today
                  ? 'text-brand'
                  : work
                    ? 'text-foreground'
                    : 'text-muted-foreground',
            )}
          >
            <span className={cn('text-[11px] font-semibold', on ? 'text-white/80' : 'opacity-80')}>
              {WEEKDAYS[date.getDay()]}
            </span>
            <span className="text-base font-bold tabular-nums">{day}</span>
            <span
              className={cn(
                'size-1 rounded-full',
                work ? (on ? 'bg-white' : 'bg-brand') : 'bg-transparent',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

/** 지금 한국 시간 (0시부터 몇 분째, 0~1439) — 근무 시간 "13:00"과 비교한다 */
function kstMinutes() {
  return Math.floor(((Date.now() + 9 * 60 * 60 * 1000) % (24 * 60 * 60 * 1000)) / 60_000)
}

/** 1분마다 다시 읽는 지금 시각(분). 화면이 안 보이면(다른 앱 · 탭) 멈추고, 돌아오면 바로 다시 읽는다 */
function useMinuteNow() {
  const [now, setNow] = useState(kstMinutes)
  useEffect(() => {
    let timer: number | undefined
    const run = () => {
      window.clearInterval(timer)
      timer = document.hidden ? undefined : window.setInterval(() => setNow(kstMinutes()), 60_000)
    }
    const onVisibility = () => {
      if (!document.hidden) setNow(kstMinutes())
      run()
    }
    run()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
  return now
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** 근무 전 "3시간 후"(1시간 미만 "40분 후") · 근무 중 "2시간 남음" + 지난 비율 · 퇴근 후 "오늘 근무 끝" (자정 넘는 근무는 끝 + 24시간) */
function shiftPhase(start: string, end: string, now: number) {
  const from = toMinutes(start)
  let to = toMinutes(end)
  if (to <= from) to += 24 * 60
  const span = (minutes: number) =>
    minutes < 60 ? `${minutes}분` : `${Math.round(minutes / 60)}시간`
  if (now < from) return { kind: 'before' as const, text: `${span(from - now)} 후` }
  if (now < to) {
    return {
      kind: 'during' as const,
      text: `${span(to - now)} 남음`,
      progress: (now - from) / (to - from),
    }
  }
  return { kind: 'after' as const, text: '오늘 근무 끝' }
}

/** "민수와 함께" · "민수 · 도윤과 함께" (마지막 이름 받침에 맞춰 와/과), 없으면 "혼자 근무" */
function crewText(crew: string[]) {
  if (crew.length === 0) return '혼자 근무'
  const names = crew.join(' · ')
  const code = names.charCodeAt(names.length - 1) - 0xac00
  const batchim = code >= 0 && code < 11172 && code % 28 !== 0
  return `${names}${batchim ? '과' : '와'} 함께`
}

/**
 * 오늘 근무 출근 티켓: 위 사진 띠(88px, 오른쪽 위 "월급날 D-20" 칩) + 아래 흰 영역 3줄
 * (오늘 · 근무 이름 / 상태 → 시간 26px (+ 근무 중이면 진행 막대) → 같이 일하는 사람). 카드 전체가 근무 탭 링크
 */
function TodayShiftCard({
  store,
  shift,
  today,
}: {
  store: StaffStoreView
  shift: Shift
  today: Date
}) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const showPhoto = store.photo && !photoFailed
  const now = useMinuteNow()
  const phase = shiftPhase(shift.start, shift.end, now)
  const label = shiftLabel(shift)
  const together = crewText(shift.crew)
  // 월급날: 예상 급여 탭과 같은 데이터 · 계산 (lib/api/payroll). 급여일이 없거나 못 불러오면 칩 없음
  const estimate = useMyPayrollEstimate(store.id, null, { silent: true }).data
  const payDate = estimate ? payDateOf(estimate) : null
  const dDay = payDate ? daysUntil(payDate, today) : null
  const payday = dDay === null || dDay < 0 ? null : dDay === 0 ? '월급날 D-DAY' : `월급날 D-${dDay}`
  const phaseSpoken = phase.kind === 'before' ? `${phase.text} 출근` : phase.text

  return (
    <Link
      to="/staff/schedule"
      aria-label={`오늘 ${label} ${shift.start} – ${shift.end}, ${phaseSpoken}, ${together}${payday ? `, ${payday}` : ''} · 근무 보기`}
      // 흰 바탕 위 흰 카드라 옅은 테두리로 구분 (docs/08 4). 모서리 24 그대로
      className={cn('block overflow-hidden rounded-3xl border border-line/60 bg-white', PRESSABLE)}
    >
      {/* 사진 띠 (사진 없는 매장은 매장 색 바탕) */}
      <div className={cn('relative isolate h-22', !showPhoto && 'bg-brand texture')}>
        {showPhoto && (
          <img
            src={store.photo}
            alt=""
            onError={() => setPhotoFailed(true)}
            className="absolute inset-0 -z-10 size-full object-cover"
          />
        )}
        {payday && (
          // 사진 위 칩 규칙: 사진이면 검정 반투명, 매장 색 바탕이면 흰 반투명 + 흐림
          <span
            aria-hidden="true"
            className={cn(
              'absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap text-white tabular-nums backdrop-blur-md',
              showPhoto ? 'bg-black/35' : 'bg-white/15',
            )}
          >
            {payday}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 p-5">
        <div className="flex items-center justify-between gap-3 text-[13px] font-medium">
          <span className="truncate text-muted-foreground">오늘 · {label}</span>
          {/* 강조색은 이 상태 하나만 (퇴근 후는 회색) */}
          <span
            className={cn(
              'shrink-0 font-bold tabular-nums',
              phase.kind === 'after' ? 'text-muted-foreground' : 'text-brand',
            )}
          >
            {phase.text}
          </span>
        </div>
        <span className="text-[26px] leading-[1.25] font-extrabold tracking-[-0.03em] whitespace-nowrap text-foreground tabular-nums">
          {shift.start} – {shift.end}
        </span>
        {phase.kind === 'during' && (
          // 근무 중일 때만: 지난 비율만큼 매장 색 (4px, 둥근 끝)
          <span aria-hidden="true" className="my-1 h-1 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-brand"
              style={{ width: `${Math.round(phase.progress * 100)}%` }}
            />
          </span>
        )}
        <span className="text-[13px] font-medium break-keep text-muted-foreground">{together}</span>
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
  selectedDate,
  onSelectDate,
  weekNav,
}: {
  store: StaffStoreView
  today: Date
  week: WeekDay[]
  selectedDate: Date
  onSelectDate: (date: Date) => void
  /** 요일 줄 양옆 ‹ › · [이번 주로] (shared/WeekNav) */
  weekNav: { thisWeek: boolean; onMove: (step: number) => void; onThisWeek: () => void }
}) {
  const live = isSameDay(selectedDate, today)
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
  // 요일 줄 · 제목 · 내용이 스크롤해서 처음 보일 때 차례로 떠오르기 (불러온 내용이 바뀌면 다시 본다)
  const revealRef = useRevealChildren<HTMLElement>([notesQuery.status, withItems.length > 0])

  return (
    // 출근 전 배너 [인수인계 보기]가 여기로 내려온다: 요일 줄부터 보이게 (scroll-mt: 위 헤더만큼)
    <section ref={revealRef} id="today-handover" className="flex scroll-mt-20 flex-col gap-3">
      {/* [‹] 요일 줄 [›] 한 줄 (+ 이번 주가 아니면 아래 가운데 [이번 주로]) */}
      <WeekNav {...weekNav}>
        <WeekStrip week={week} today={today} selected={selectedDate} onSelect={onSelectDate} />
      </WeekNav>
      <SectionHeader
        title={title}
        action={live ? { label: '남기기', to: '/staff/handover' } : undefined}
      />

      {notesQuery.isPending ? (
        <HandoverSkeleton />
      ) : notesQuery.isError ? (
        <LoadError
          what="인수인계를"
          error={notesQuery.error}
          onRetry={() => notesQuery.refetch()}
        />
      ) : withItems.length > 0 ? (
        // data-reveal-group: AI 요약 · 목록이 따로따로 떠오르게 (useRevealChildren 이 이 안의 자식을 본다)
        <div data-reveal-group className="flex flex-col gap-2">
          <AiSummaryCard
            from={`${authors}명이 남김`}
            summary={summary}
            done={live ? items.filter((item) => item.checked).length : items.length}
            total={items.length}
          />
          {/* 알바 홈: 카드 한 장 안의 할 일 목록 모양 (사장님 홈은 기본 card 그대로) */}
          <HandoverList
            variant="list"
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
              onClick={() => navigate('/staff/handover', { preventScrollReset: true })}
            >
              인수인계 남기기
            </Button>
          }
        />
      ) : (
        // 지난 날 · 앞날: 큰 아이콘 없이 한 줄 (docs/08 6. 빈 화면)
        <EmptyGuide
          message={
            selectedDate > today
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

/** 인수인계 불러오는 중: AI 요약 카드 + 목록 카드 모양 */
function HandoverSkeleton() {
  return (
    <SkeletonGroup label="인수인계를 불러오는 중" className="flex flex-col gap-2">
      <Skeleton className="h-32 rounded-3xl" />
      <div className="flex flex-col gap-4 rounded-3xl bg-card p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton shape="circle" className="size-6" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton shape="line" className={i === 1 ? 'w-1/2' : 'w-3/4'} />
              <Skeleton shape="line" className="w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonGroup>
  )
}

/** 홈 불러오는 중 (근무를 받기 전): 날짜 제목 · 오늘 근무 카드 · 요일 줄 · 인수인계 자리 */
function HomeSkeleton() {
  return (
    <SkeletonGroup label="홈을 불러오는 중" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton shape="line" className="mx-1 h-7 w-28" />
        <Skeleton className="h-44 rounded-3xl" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-full" />
          ))}
        </div>
        <Skeleton shape="line" className="mx-1 h-5 w-36" />
        <HandoverSkeleton />
      </div>
    </SkeletonGroup>
  )
}
