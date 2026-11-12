import {
  BookOpen,
  CalendarCheck,
  Check,
  ChevronRight,
  Coffee,
  UserPlus,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { toDateKey } from '@/lib/date'
import { formatDate, formatTime, formatWon } from '@/lib/format'
import { useOnDuty, useOwnerQuestions } from '@/pages/owner/api/home'
import { useOwnerProfile } from '@/pages/owner/api/stores'
import { useOwnerCalendar } from '@/pages/owner/api/fixedSchedule'
import type { OwnerQuestionItem } from '@/pages/owner/api/types'
import { useStorePayroll } from '@/pages/owner/api/work'
import { questionSentence } from '@/pages/owner/components/questionText'
import { hasSeenOwnerGuide } from '@/pages/owner/guide/ownerGuideSeen'
import { HomeHandover } from '@/pages/owner/home/components/HomeHandover'
import { QuestionSheet } from '@/pages/owner/home/components/QuestionSheet'
import { StorePhotoSheet } from '@/pages/owner/home/components/StorePhotoSheet'
import { useOwnerStore, type OwnerStoreView } from '@/pages/owner/useOwnerStore'
import { ShiftBanner } from '@/pages/staff/home/components/ShiftBanner'
import { MANUAL_ICON, DEFAULT_MANUAL_ICON } from '@/shared/icons'
import { cn } from '@/ui/utils'

// 사장님 홈: 인사 · 지금 근무 중 · 바로가기 · 확인 필요(질문 · 인건비) · 인수인계
// 데스크톱(lg)은 대시보드: 오른쪽 칸에 출근 전 배너 · 인건비 링 · 바로가기 타일 · 오늘 근무

const QUICK: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/owner/manuals', label: '매뉴얼', icon: BookOpen },
  { to: '/owner/recipes', label: '레시피', icon: Coffee },
  { to: '/owner/members/new', label: '직원 초대', icon: UserPlus },
  { to: '/owner/schedule', label: '스케줄', icon: CalendarCheck },
]

export default function OwnerHomePage() {
  // 사장님 홈에 처음 들어왔고(매장 등록 직후 포함) 앱 사용법을 아직 안 봤으면 한 번 보여 준다 (다 보면 다시 홈으로)
  if (!hasSeenOwnerGuide()) return <Navigate to="/owner/guide" replace />
  return <OwnerHome />
}

function OwnerHome() {
  const { store, today } = useOwnerStore()
  const profile = useOwnerProfile()
  const questions = useOwnerQuestions(store.storeId)
  const [params, setParams] = useSearchParams()
  const openId = params.get('question')
  const list = questions.data?.questions ?? []
  const open = list.find((q) => q.questionId === openId)
  const surname = (profile.data?.name ?? '박').slice(0, 1)

  return (
    // 휴대폰: 한 줄 (인사 → 배너 → 매장 카드 → 바로가기 → 확인 필요 → 인수인계, order 로 순서 고정)
    // 데스크톱(lg): 왼쪽 넓은 칸(인사 · 매장 카드 · 확인 필요 · 인수인계) + 오른쪽 칸(배너 · 인건비 · 바로가기 · 오늘 근무)
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="contents lg:flex lg:flex-col lg:gap-7">
        <div className="order-1 flex flex-col gap-2 px-1 break-keep lg:order-none">
          <span className="text-[13px] font-medium text-muted-foreground">{formatDate(today)}</span>
          <h1 className="font-suite m-0 text-[28px] leading-[1.3] font-extrabold tracking-[-0.03em] lg:text-[32px]">
            안녕하세요,
            <br className="lg:hidden" /> {surname} 사장님
          </h1>
          <span className="hidden text-[15px] text-muted-foreground lg:block">
            오늘 매장 소식을 한눈에 볼 수 있어요
          </span>
        </div>

        <div className="order-3 lg:order-none">
          <OnDutyCard store={store} />
        </div>

        <nav aria-label="바로가기" className="order-4 grid grid-cols-4 gap-2 lg:hidden">
          {QUICK.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex flex-col items-center gap-2 text-foreground">
              <span className="flex size-[58px] items-center justify-center rounded-full bg-card text-brand shadow-soft">
                <Icon className="size-6" />
              </span>
              <span className="text-xs font-semibold whitespace-nowrap">{label}</span>
            </Link>
          ))}
        </nav>

        <section className="order-5 flex flex-col gap-3.5 lg:order-none">
          <div className="flex items-baseline justify-between gap-2.5 px-1">
            <h2 className="m-0 text-xl font-extrabold tracking-[-0.02em]">확인 필요</h2>
            <span className="text-[13px] font-semibold whitespace-nowrap text-[#4F554D]">
              {list.length}건
            </span>
          </div>
          {/* 휴대폰은 옆으로 넘기기, 데스크톱은 칸 나누기 (인건비 카드는 데스크톱에서 오른쪽 칸으로) */}
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pt-0.5 pb-2 lg:mx-0 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] lg:overflow-visible lg:p-0">
            {list.length > 0 ? (
              list.map((q) => (
                <QuestionCard
                  key={q.questionId}
                  question={q}
                  onOpen={() => setParams({ question: q.questionId })}
                />
              ))
            ) : (
              <div className="flex min-h-[210px] flex-[0_0_74%] flex-col gap-2.5 rounded-[30px] bg-card p-5 shadow-soft lg:min-h-[180px]">
                <span className="flex size-[42px] items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Check className="size-[22px]" />
                </span>
                <span className="mt-1.5 text-lg font-extrabold">모두 답했어요</span>
                <span className="text-sm text-[#6B7068]">답변은 매뉴얼에 반영돼요</span>
              </div>
            )}
            <div className="flex flex-[0_0_74%] lg:hidden">
              <PayrollCard storeId={store.storeId} today={today} />
            </div>
          </div>
        </section>

        <div className="order-6 lg:order-none">
          <HomeHandover key={store.storeId} storeId={store.storeId} today={today} />
        </div>
      </div>

      <aside className="contents lg:sticky lg:top-7 lg:flex lg:flex-col lg:gap-5">
        {/* 사장님 근무 30분 전 ~ 끝까지: 체크 안 된 인수인계 (BE #41, 알바 홈과 같은 배너) — 없으면 칸도 없앤다 */}
        <div className="order-2 empty:hidden lg:order-none">
          <ShiftBanner storeId={store.storeId} today={today} />
        </div>
        <PayrollRing storeId={store.storeId} today={today} />
        <QuickTiles />
        <TodayShifts storeId={store.storeId} today={today} />
      </aside>

      {open && <QuestionSheet question={open} onClose={() => setParams({})} />}
    </div>
  )
}

function OnDutyCard({ store }: { store: OwnerStoreView }) {
  const query = useOnDuty(store.storeId)
  const [photoFailed, setPhotoFailed] = useState(false)
  const showPhoto = !!store.photoUrl && !photoFailed
  const people = query.data?.people ?? []
  const [editingPhoto, setEditingPhoto] = useState(false)

  return (
    <>
      <section className="relative isolate min-h-[220px] overflow-hidden rounded-[30px] bg-brand texture lg:min-h-[280px]">
        {showPhoto && (
          <img
            src={store.photoUrl ?? undefined}
            alt=""
            onError={() => setPhotoFailed(true)}
            className="absolute inset-0 -z-10 size-full object-cover"
          />
        )}
        <div className="relative flex min-h-[220px] flex-col justify-between gap-[18px] p-5 text-white lg:min-h-[280px] lg:p-7">
          <span
            className={cn(
              'flex items-center gap-2 self-start rounded-full py-[5px] pr-[13px] pl-[5px] text-[13px] font-bold whitespace-nowrap backdrop-blur-md',
              showPhoto ? 'bg-black/35' : 'bg-white/15',
            )}
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-white">
              <span
                className={cn('size-2.5 rounded-full', people.length ? 'bg-[#6FA97B]' : 'bg-faint')}
              />
            </span>
            {people.length ? `지금 근무 중 ${people.length}명` : '근무 중인 직원 없음'}
          </span>
          {/* 데스크톱: 아래 왼쪽에 매장 이름 · 근무 중인 사람 (사진 위라 아래만 어둡게) */}
          {showPhoto && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 hidden h-2/3 bg-linear-to-t from-black/55 to-transparent lg:block" />
          )}
          <div className="flex items-end gap-4">
            <div className="hidden min-w-0 flex-1 flex-col gap-1.5 lg:flex">
              <span className="text-[32px] leading-tight font-extrabold tracking-[-0.03em]">
                {store.name}
              </span>
              <span className="truncate text-[15px] font-semibold opacity-85">
                {people.length
                  ? `${people.map((p) => p.name).join(' · ')} 근무 중`
                  : '지금은 근무 중인 사람이 없어요'}
              </span>
            </div>
            {/* 아래는 버튼만 — 누르면 매장 사진 변경 (11/12) */}
            <button
              type="button"
              onClick={() => setEditingPhoto(true)}
              aria-label="매장 사진 변경"
              className="ml-auto flex size-[46px] shrink-0 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-transform active:scale-[0.97]"
            >
              <ChevronRight className="size-6" />
            </button>
          </div>
        </div>
      </section>
      {editingPhoto && (
        <StorePhotoSheet storeId={store.storeId} onClose={() => setEditingPhoto(false)} />
      )}
    </>
  )
}

function QuestionCard({ question, onOpen }: { question: OwnerQuestionItem; onOpen: () => void }) {
  const Icon = (question.icon && MANUAL_ICON[question.icon]) || DEFAULT_MANUAL_ICON
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-[210px] flex-[0_0_74%] flex-col gap-2.5 rounded-[30px] bg-brand texture p-5 text-left text-white lg:min-h-[180px]"
    >
      <span className="flex size-[42px] items-center justify-center rounded-full bg-white text-brand">
        <Icon className="size-[22px]" />
      </span>
      <span className="mt-1.5 text-lg font-extrabold">{question.staffName} 님의 질문</span>
      <span className="text-sm leading-[1.55] break-keep opacity-80">
        {questionSentence(question.question)}
      </span>
      <span className="mt-auto flex w-full items-center justify-between gap-2.5">
        <span className="text-xs whitespace-nowrap opacity-70">
          {question.staffName} · {formatTime(question.askedAt)}
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-foreground">
          <ChevronRight className="size-[22px]" />
        </span>
      </span>
    </button>
  )
}

function PayrollCard({ storeId, today }: { storeId: string; today: Date }) {
  const payroll = useStorePayroll(storeId, toDateKey(today).slice(0, 7))
  const total = (payroll.data?.members ?? []).reduce((sum, m) => sum + m.total, 0)
  return (
    <Link
      to="/owner/payroll"
      className="flex min-h-[210px] flex-1 flex-col gap-2.5 rounded-[30px] bg-brand-soft p-5 text-foreground"
    >
      <span className="flex size-[42px] items-center justify-center rounded-full bg-white text-brand">
        <Wallet className="size-[22px]" />
      </span>
      <span className="mt-1.5 text-lg font-extrabold">{today.getMonth() + 1}월 인건비</span>
      <span className="text-[13px] text-[#4F6A5A]">
        주휴수당 포함 · {formatDate(today)}까지 · 참고용
      </span>
      <span className="mt-auto flex w-full items-end justify-between gap-2.5">
        <span className="text-2xl font-extrabold tracking-[-0.03em] whitespace-nowrap">
          {payroll.data ? formatWon(total) : '—'}
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-white">
          <ChevronRight className="size-[22px]" />
        </span>
      </span>
    </Link>
  )
}

// ── 데스크톱 오른쪽 칸 (lg 이상에서만 보인다) ──

/** 이번 달 인건비 + 달 진행 링 (며칠 지났는지) */
function PayrollRing({ storeId, today }: { storeId: string; today: Date }) {
  const payroll = useStorePayroll(storeId, toDateKey(today).slice(0, 7))
  const total = (payroll.data?.members ?? []).reduce((sum, m) => sum + m.total, 0)
  const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const percent = Math.round((today.getDate() / days) * 100)
  const r = 44
  const length = 2 * Math.PI * r

  return (
    <section className="hidden flex-col gap-4 rounded-[26px] bg-card p-5 shadow-soft lg:flex">
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-[17px] font-extrabold">{today.getMonth() + 1}월 인건비</h2>
        <Link to="/owner/payroll" className="text-[13px] font-semibold text-muted-foreground">
          자세히
        </Link>
      </div>
      <div className="flex items-center gap-5">
        <div className="relative size-[100px] shrink-0 xl:size-[112px]">
          <svg viewBox="0 0 112 112" className="size-full -rotate-90" aria-hidden="true">
            <circle
              cx="56"
              cy="56"
              r={r}
              fill="none"
              strokeWidth="12"
              className="stroke-brand-soft"
            />
            <circle
              cx="56"
              cy="56"
              r={r}
              fill="none"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={length}
              strokeDashoffset={length * (1 - percent / 100)}
              className="stroke-brand transition-[stroke-dashoffset] duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold tabular-nums">{percent}%</span>
            <span className="text-[11px] text-muted-foreground">
              {today.getDate()}/{days}일
            </span>
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xl font-extrabold tracking-[-0.03em] whitespace-nowrap tabular-nums xl:text-[22px]">
            {payroll.data ? formatWon(total) : '—'}
          </span>
          <span className="text-[13px] leading-snug break-keep text-muted-foreground">
            {formatDate(today)}까지 · 주휴수당 포함 · 참고용
          </span>
        </div>
      </div>
    </section>
  )
}

/** 바로가기 (휴대폰의 동그라미 4개를 데스크톱에서는 타일로) — 네 칸 모두 매장 색 한 가지 (연한 바탕 + 진한 글자) */

function QuickTiles() {
  return (
    <section className="hidden flex-col gap-3 lg:flex">
      <h2 className="m-0 px-1 text-[17px] font-extrabold">바로가기</h2>
      <nav aria-label="바로가기" className="grid grid-cols-2 gap-2.5">
        {QUICK.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-2.5 rounded-[18px] bg-brand-soft px-3.5 py-3.5 text-sm font-bold text-brand transition-transform active:scale-[0.98]"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/70">
              <Icon className="size-[18px]" />
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </section>
  )
}

/** 오늘 근무 (근무표 달력의 오늘 칸을 시간 순으로) — 지금 근무 중이면 진한 점 */
function TodayShifts({ storeId, today }: { storeId: string; today: Date }) {
  const key = toDateKey(today)
  const query = useOwnerCalendar(storeId, key, key)
  const shifts = (query.data?.shifts ?? [])
    .filter((s) => s.date === key)
    .sort((a, b) => a.start.localeCompare(b.start))
  const onDuty = new Set((useOnDuty(storeId).data?.people ?? []).map((p) => p.userId))

  return (
    <section className="hidden flex-col gap-3 rounded-[26px] bg-card p-5 shadow-soft lg:flex">
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-[17px] font-extrabold">오늘 근무</h2>
        <Link to="/owner/schedule" className="text-[13px] font-semibold text-muted-foreground">
          근무표
        </Link>
      </div>
      {query.isPending ? (
        <span className="py-2 text-sm text-muted-foreground">불러오는 중…</span>
      ) : shifts.length === 0 ? (
        <span className="py-2 text-sm text-muted-foreground">오늘은 근무가 없어요</span>
      ) : (
        <ol className="m-0 flex list-none flex-col p-0">
          {shifts.map((s, i) => {
            const now = onDuty.has(s.assignee.userId)
            return (
              <li key={`${s.templateId}-${s.assignee.userId}-${i}`} className="flex gap-3">
                {/* 시간 줄 (점 + 세로선) */}
                <span className="flex flex-col items-center pt-1.5">
                  <span
                    className={cn(
                      'size-2.5 shrink-0 rounded-full',
                      now ? 'bg-brand ring-4 ring-brand-soft' : 'bg-line',
                    )}
                  />
                  {i < shifts.length - 1 && <span className="w-px flex-1 bg-line/70" />}
                </span>
                <span className="flex min-w-0 flex-1 items-baseline gap-3 pb-3.5">
                  <span className="w-12 shrink-0 text-[13px] font-bold tabular-nums">
                    {s.start}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-bold">
                      {s.assignee.name} · {s.name}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {s.start}–{s.end}
                      {now && ' · 근무 중'}
                    </span>
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
