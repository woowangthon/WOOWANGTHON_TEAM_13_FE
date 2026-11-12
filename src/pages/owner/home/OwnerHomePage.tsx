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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 px-1 break-keep">
        <span className="text-[13px] font-medium text-muted-foreground">{formatDate(today)}</span>
        <h1 className="m-0 text-[28px] leading-[1.3] font-extrabold tracking-[-0.03em]">
          안녕하세요,
          <br />
          {surname} 사장님
        </h1>
      </div>

      {/* 사장님 근무 30분 전 ~ 끝까지: 체크 안 된 인수인계 (BE #41, 알바 홈과 같은 배너) */}
      <ShiftBanner storeId={store.storeId} today={today} />

      <OnDutyCard store={store} />

      <nav aria-label="바로가기" className="grid grid-cols-4 gap-2">
        {QUICK.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="flex flex-col items-center gap-2 text-foreground">
            <span className="flex size-[58px] items-center justify-center rounded-full bg-card text-brand shadow-soft">
              <Icon className="size-6" />
            </span>
            <span className="text-xs font-semibold whitespace-nowrap">{label}</span>
          </Link>
        ))}
      </nav>

      <section className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between gap-2.5 px-1">
          <h2 className="m-0 text-xl font-extrabold tracking-[-0.02em]">확인 필요</h2>
          <span className="text-[13px] font-semibold whitespace-nowrap text-[#4F554D]">
            {list.length}건
          </span>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pt-0.5 pb-2">
          {list.length > 0 ? (
            list.map((q) => (
              <QuestionCard
                key={q.questionId}
                question={q}
                onOpen={() => setParams({ question: q.questionId })}
              />
            ))
          ) : (
            <div className="flex min-h-[210px] flex-[0_0_74%] flex-col gap-2.5 rounded-[30px] bg-card p-5 shadow-soft">
              <span className="flex size-[42px] items-center justify-center rounded-full bg-brand-soft text-brand">
                <Check className="size-[22px]" />
              </span>
              <span className="mt-1.5 text-lg font-extrabold">모두 답했어요</span>
              <span className="text-sm text-[#6B7068]">답변은 매뉴얼에 반영돼요</span>
            </div>
          )}
          <PayrollCard storeId={store.storeId} today={today} />
        </div>
      </section>

      <HomeHandover key={store.storeId} storeId={store.storeId} today={today} />

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
      <section className="relative isolate min-h-[220px] overflow-hidden rounded-[30px] bg-brand texture">
        {showPhoto && (
          <img
            src={store.photoUrl ?? undefined}
            alt=""
            onError={() => setPhotoFailed(true)}
            className="absolute inset-0 -z-10 size-full object-cover"
          />
        )}
        <div className="relative flex min-h-[220px] flex-col justify-between gap-[18px] p-5 text-white">
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
          {/* 아래는 버튼만 — 누르면 매장 사진 변경 (11/12) */}
          <button
            type="button"
            onClick={() => setEditingPhoto(true)}
            aria-label="매장 사진 변경"
            className="flex size-[46px] shrink-0 items-center justify-center self-end rounded-full bg-black/35 text-white backdrop-blur-md transition-transform active:scale-[0.97]"
          >
            <ChevronRight className="size-6" />
          </button>
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
      className="flex min-h-[210px] flex-[0_0_74%] flex-col gap-2.5 rounded-[30px] bg-brand texture p-5 text-left text-white"
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
      className="flex min-h-[210px] flex-[0_0_74%] flex-col gap-2.5 rounded-[30px] bg-brand-soft p-5 text-foreground"
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
