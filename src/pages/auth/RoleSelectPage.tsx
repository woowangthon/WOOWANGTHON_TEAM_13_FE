import { ChevronRight, IdCard, Store, type LucideIcon } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { signOut } from '@/lib/auth'
import { useAuthStore, type StoreRole } from '@/lib/authStore'
import { env } from '@/lib/env'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { HeroHeadline } from '@/pages/auth/components/HeroHeadline'
import { OnboardingHeader } from '@/pages/auth/components/OnboardingHeader'
import { Button } from '@/ui/Button'
import { Spinner } from '@/ui/Spinner'
import { PRESSABLE } from '@/shared/pressable'
import { cn } from '@/ui/utils'

// 역할 선택 (디자인: docs/design/login-onboarding.html): 사장님은 매장 등록, 알바생은 초대코드 입장으로
// 데스크톱(lg 1024px 이상, 11/14 나현 · 민지 OK): 왼쪽 로그인과 같은 큰 문구 · 오른쪽 가운데에 카드 두 장(선택) → [○○으로 시작] 두 단계.
//   카드는 선택만 하고 아래 버튼을 눌러야 넘어간다(오터치 방지). 휴대폰 · 태블릿은 카드를 누르면 바로 넘어가는 그대로

const CHOICES: {
  role: StoreRole
  icon: LucideIcon
  title: string
  desc: string
  /** 데스크톱 카드 아래 혜택 태그 */
  tags: string[]
  to: string
}[] = [
  {
    role: 'owner',
    icon: Store,
    title: '사장님',
    desc: '매장 등록 · 직원 초대',
    tags: ['매장 등록', '직원 초대', '매뉴얼 올리기'],
    to: '/owner/store/new',
  },
  {
    role: 'staff',
    icon: IdCard,
    title: '알바생',
    desc: '초대코드로 입장',
    tags: ['초대코드 입장', '근무 확인', 'AI 사수에게 질문'],
    to: '/staff/join',
  },
]

export default function RoleSelectPage() {
  const navigate = useNavigate()
  const isReady = useAuthStore((state) => state.isReady)
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const me = useAuthStore((state) => state.me)
  const setPendingRole = useAuthStore((state) => state.setPendingRole)
  const pendingRole = useAuthStore((state) => state.pendingRole)
  // 데스크톱에서 고른 역할 (처음 · 돌아왔을 땐 이전에 고른 역할, 없으면 사장님)
  const [selected, setSelected] = useState<StoreRole>(pendingRole ?? 'owner')
  const radios = useRef<(HTMLButtonElement | null)[]>([])

  if (!env.skipAuth) {
    if (!isReady) return <Spinner className="min-h-dvh items-center" />
    if (!isLoggedIn) return <Navigate to="/login" replace />
  }

  const choose = (role: StoreRole, to: string) => {
    setPendingRole(role)
    navigate(to)
  }

  // 뒤로 = 로그인 화면으로 (다른 계정으로 다시 로그인)
  const back = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  // 방향키로 카드 이동 (라디오 묶음: 옮기면 바로 선택)
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const move = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key]
    if (!move) return
    event.preventDefault()
    const current = CHOICES.findIndex((c) => c.role === selected)
    const next = (current + move + CHOICES.length) % CHOICES.length
    setSelected(CHOICES[next].role)
    radios.current[next]?.focus()
  }
  const picked = CHOICES.find((c) => c.role === selected) ?? CHOICES[0]
  const greeting = me && (
    <p className="m-0 text-[13px] font-medium text-muted-foreground">{me.nickname} 님, 환영해요</p>
  )

  return (
    <AuthFrame
      tone="white"
      aside={<HeroHeadline as="p" />}
      desktopTop={<OnboardingHeader step={0} onBack={back} hideDots />}
      desktopForm={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 px-1">
            {greeting}
            <h1 className="m-0 text-[26px] leading-[1.25] font-extrabold tracking-[-0.03em]">
              어떻게 사용하세요?
            </h1>
          </div>
          <div
            role="radiogroup"
            aria-label="사용 방식"
            onKeyDown={onKeyDown}
            className="flex flex-col gap-4"
          >
            {CHOICES.map(({ role, icon: Icon, title, desc, tags }, i) => {
              const on = selected === role
              return (
                <button
                  key={role}
                  ref={(el) => {
                    radios.current[i] = el
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setSelected(role)}
                  className={cn(
                    'flex items-center gap-5 rounded-[28px] border-2 px-7 py-6 text-left text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                    on
                      ? 'border-brand bg-accent/40'
                      : 'border-line/40 bg-card hover:border-muted-foreground/50',
                  )}
                >
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-[20px] bg-brand-soft text-brand">
                    <Icon aria-hidden="true" className="size-6" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[19px] leading-[1.3] font-extrabold tracking-[-0.02em]">
                        {title}
                      </span>
                      <span className="text-[13px] font-medium text-muted-foreground">{desc}</span>
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full border-2',
                      on ? 'border-brand bg-brand' : 'border-line',
                    )}
                  >
                    {on && <span className="size-2.5 rounded-full bg-white" />}
                  </span>
                </button>
              )
            })}
          </div>
          <Button
            className="mt-2 h-[58px] w-full text-base font-extrabold"
            onClick={() => choose(picked.role, picked.to)}
          >
            {picked.title}으로 시작
          </Button>
        </div>
      }
    >
      <OnboardingHeader step={0} onBack={back} />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 px-1 pt-1">
          {greeting}
          <h1 className="m-0 text-[26px] leading-[1.25] font-extrabold tracking-[-0.03em]">
            어떻게
            <br />
            사용하세요?
          </h1>
        </div>

        {/* 두 카드는 같은 크기 · 같은 강도 (어느 쪽도 먼저 고르라고 밀지 않는다). 아이콘은 동그라미 없이, › 만 */}
        <div className="flex flex-col gap-2">
          {CHOICES.map(({ role, icon: Icon, title, desc, to }) => (
            <button
              key={role}
              type="button"
              onClick={() => choose(role, to)}
              className={cn(
                'flex items-center gap-4 rounded-3xl border border-line/60 bg-card px-5 py-5 text-left text-foreground',
                PRESSABLE,
              )}
            >
              <Icon aria-hidden="true" className="size-6 shrink-0 text-brand" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[19px] leading-[1.3] font-bold tracking-[-0.02em]">
                  {title}
                </span>
                <span className="text-[13px] font-medium text-muted-foreground">{desc}</span>
              </span>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-subtle" />
            </button>
          ))}
        </div>
      </div>
    </AuthFrame>
  )
}
