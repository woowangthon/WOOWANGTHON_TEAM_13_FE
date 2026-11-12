import { ChevronRight, IdCard, Store, type LucideIcon } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router'
import { signOut } from '@/lib/auth'
import { useAuthStore, type StoreRole } from '@/lib/authStore'
import { env } from '@/lib/env'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { OnboardingHeader } from '@/pages/auth/components/OnboardingHeader'
import { Spinner } from '@/ui/Spinner'
import { PRESSABLE } from '@/shared/pressable'
import { cn } from '@/ui/utils'

// 역할 선택 (디자인: docs/design/login-onboarding.html): 사장님은 매장 등록, 알바생은 초대코드 입장으로

const CHOICES: {
  role: StoreRole
  icon: LucideIcon
  title: string
  desc: string
  to: string
}[] = [
  {
    role: 'owner',
    icon: Store,
    title: '사장님',
    desc: '매장 등록 · 직원 초대',
    to: '/owner/store/new',
  },
  {
    role: 'staff',
    icon: IdCard,
    title: '알바생',
    desc: '초대코드로 입장',
    to: '/staff/join',
  },
]

export default function RoleSelectPage() {
  const navigate = useNavigate()
  const isReady = useAuthStore((state) => state.isReady)
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const me = useAuthStore((state) => state.me)
  const setPendingRole = useAuthStore((state) => state.setPendingRole)

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

  return (
    <AuthFrame tone="white">
      <OnboardingHeader step={0} onBack={back} />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 px-1 pt-1">
          {me && (
            <p className="m-0 text-[13px] font-medium text-muted-foreground">
              {me.nickname} 님, 환영해요
            </p>
          )}
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
