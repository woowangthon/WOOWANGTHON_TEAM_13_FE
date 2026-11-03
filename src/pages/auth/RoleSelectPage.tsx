import { ArrowLeft, ChevronRight, IdCard, Store, type LucideIcon } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router'
import { signOut } from '@/lib/auth'
import { useAuthStore, type StoreRole } from '@/lib/authStore'
import { env } from '@/lib/env'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { IconButton } from '@/ui/IconButton'
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

/** 상단 로그인 방식 표시 [글자, 바탕, 글자색] (카카오 · 구글 브랜드 색) */
const PROVIDER_MARK: Record<string, { label: string; mark: string; bg: string; fg: string }> = {
  kakao: { label: '카카오', mark: 'K', bg: '#FEE500', fg: '#000000' },
  google: { label: 'Google', mark: 'G', bg: '#E8EEF9', fg: '#4285F4' },
}

export default function RoleSelectPage() {
  const navigate = useNavigate()
  const isReady = useAuthStore((state) => state.isReady)
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const me = useAuthStore((state) => state.me)
  const provider = useAuthStore((state) => state.provider)
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

  const mark = provider ? PROVIDER_MARK[provider] : undefined

  return (
    <AuthFrame>
      <header className="flex items-center justify-between gap-2.5 px-0.5 py-1">
        <IconButton aria-label="뒤로" onClick={back}>
          <ArrowLeft />
        </IconButton>
        {/* 진행 점: 역할 선택 → 매장 등록 · 초대코드 입력 */}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-[22px] rounded-full bg-brand" />
          <span className="size-1.5 rounded-full bg-line" />
        </div>
        {mark ? (
          <span className="flex items-center gap-1.5 rounded-full bg-card py-[7px] pr-[11px] pl-2 text-xs font-semibold text-muted-foreground">
            <span
              className="flex size-4 items-center justify-center rounded-full text-[9px] font-black"
              style={{ background: mark.bg, color: mark.fg }}
            >
              {mark.mark}
            </span>
            {mark.label}
          </span>
        ) : (
          <span className="w-[42px]" />
        )}
      </header>

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
