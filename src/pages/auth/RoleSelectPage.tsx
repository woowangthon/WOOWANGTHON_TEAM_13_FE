import { ChevronRight, IdCard, Store, type LucideIcon } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router'
import { signOut } from '@/lib/auth'
import { useAuthStore, type StoreRole } from '@/lib/authStore'
import { env } from '@/lib/env'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { OnboardingHeader } from '@/pages/auth/components/OnboardingHeader'
import { Spinner } from '@/ui/Spinner'
import { cn } from '@/ui/utils'

// 역할 선택 (디자인: docs/design/login-onboarding.html): 사장님은 매장 등록, 알바생은 초대코드 입장으로

const CHOICES: {
  role: StoreRole
  icon: LucideIcon
  title: string
  desc: string
  to: string
  dark: boolean
}[] = [
  {
    role: 'owner',
    icon: Store,
    title: '사장님',
    desc: '매장 등록 · 직원 초대',
    to: '/owner/store/new',
    dark: true,
  },
  {
    role: 'staff',
    icon: IdCard,
    title: '알바생',
    desc: '초대코드로 입장',
    to: '/staff/join',
    dark: false,
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
    <AuthFrame>
      <OnboardingHeader step={0} onBack={back} />

      <div className="flex flex-col gap-[22px]">
        <div className="flex flex-col gap-2 px-1 pt-1.5">
          {me && (
            <p className="m-0 text-[13px] font-medium text-muted-foreground">
              {me.nickname} 님, 환영해요
            </p>
          )}
          <h1 className="m-0 text-[28px] leading-[1.3] font-extrabold tracking-[-0.03em]">
            어떻게
            <br />
            사용하세요?
          </h1>
        </div>

        {CHOICES.map(({ role, icon: Icon, title, desc, to, dark }) => (
          <button
            key={role}
            type="button"
            onClick={() => choose(role, to)}
            className={cn(
              'flex min-h-[190px] flex-col gap-2.5 rounded-[30px] p-[22px] text-left transition-transform active:scale-[0.98]',
              dark ? 'texture bg-brand text-white' : 'bg-card text-foreground shadow-soft',
            )}
          >
            <span
              className={cn(
                'flex size-[46px] items-center justify-center rounded-full',
                dark ? 'bg-white text-brand' : 'bg-accent text-brand',
              )}
            >
              <Icon className="size-6" />
            </span>
            <span className="mt-2 text-[22px] font-extrabold tracking-[-0.02em]">{title}</span>
            <span className="mt-auto flex w-full items-end justify-between gap-2.5">
              <span className={cn('text-sm', dark ? 'opacity-80' : 'text-muted-foreground')}>
                {desc}
              </span>
              <span
                className={cn(
                  'flex size-[42px] shrink-0 items-center justify-center rounded-full',
                  dark ? 'bg-white text-foreground' : 'bg-foreground text-white',
                )}
              >
                <ChevronRight className="size-[22px]" />
              </span>
            </span>
          </button>
        ))}
      </div>
    </AuthFrame>
  )
}
