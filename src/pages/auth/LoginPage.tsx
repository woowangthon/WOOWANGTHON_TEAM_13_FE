import { Coffee, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { rememberRedirect, signIn, type OAuthProvider } from '@/lib/auth'
import { getHomePath, useAuthStore } from '@/lib/authStore'
import { wakeServer } from '@/lib/wakeServer'
import loginPhoto from '@/pages/auth/assets/login-photo.webp'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { ProviderLogo } from '@/pages/auth/components/ProviderLogo'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toastStore'

// 로그인 (디자인: docs/design/login-onboarding.html): 매장 사진 카드 + 카카오 · 구글
export default function LoginPage() {
  const isReady = useAuthStore((state) => state.isReady)
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const me = useAuthStore((state) => state.me)
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? null
  const [pending, setPending] = useState<OAuthProvider | null>(null)

  // 잠든 서버(Render 무료)를 미리 깨운다: 화면을 열 때 · 로그인 버튼을 누를 때 (30초 안에는 한 번만)
  useEffect(() => wakeServer(), [])

  if (isReady && isLoggedIn && me) return <Navigate to={from ?? getHomePath(me)} replace />

  const start = async (provider: OAuthProvider) => {
    wakeServer()
    setPending(provider)
    rememberRedirect(from)
    try {
      await signIn(provider) // 성공하면 구글 · 카카오 로그인 화면으로 넘어간다
    } catch {
      setPending(null)
      toast.error('로그인하지 못했어요. 다시 시도해 주세요', { onRetry: () => start(provider) })
    }
  }

  return (
    <AuthFrame tone="white" className="gap-[22px]">
      <section className="relative isolate flex min-h-[420px] flex-1 flex-col justify-between overflow-hidden rounded-[32px] p-[22px] text-white">
        <img src={loginPhoto} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(24,36,29,0.25)_0%,rgba(24,36,29,0.1)_35%,rgba(24,36,29,0.88)_88%)]"
        />
        <span className="flex items-center gap-2 self-start rounded-full bg-white/16 py-[5px] pr-3.5 pl-[5px] text-[15px] font-extrabold backdrop-blur-[8px]">
          <span className="flex size-[30px] items-center justify-center rounded-full bg-white text-brand">
            <Coffee className="size-[17px]" />
          </span>
          {/* 서비스 이름 (11/10 회의 확정, 로고는 나오면 바꾼다). AI 채팅 기능 이름 "AI 사수"와 헷갈리지 않게 */}
          crewBean
        </span>
        <div className="flex flex-col gap-2.5">
          <h1 className="m-0 text-[34px] leading-[1.22] font-extrabold tracking-[-0.035em]">
            매장 일,
            <br />
            묻고 바로 알기
          </h1>
          <p className="m-0 text-sm opacity-80">레시피 · 매뉴얼 · 인수인계 · 근무</p>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <Button
          variant="kakao"
          className="h-14 gap-2.5 rounded-[18px] text-base font-bold"
          disabled={pending !== null}
          onClick={() => start('kakao')}
        >
          {pending === 'kakao' ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : (
            <ProviderLogo provider="kakao" />
          )}
          카카오로 시작하기
        </Button>
        <Button
          variant="white"
          className="h-14 gap-2.5 rounded-[18px] border border-line bg-card text-base font-bold"
          disabled={pending !== null}
          onClick={() => start('google')}
        >
          {pending === 'google' ? (
            <LoaderCircle className="size-5 animate-spin text-brand" />
          ) : (
            <ProviderLogo provider="google" size={19} />
          )}
          Google로 시작하기
        </Button>
        {/* 이용약관 · 개인정보처리방침 페이지가 생기면 링크로 바꾼다 */}
        <p className="m-0 px-2.5 pt-1.5 text-center text-xs leading-relaxed text-subtle">
          시작하면{' '}
          <span className="text-muted-foreground underline underline-offset-2">이용약관</span> 및{' '}
          <span className="text-muted-foreground underline underline-offset-2">
            개인정보처리방침
          </span>
          에 동의하게 돼요
        </p>
      </section>
    </AuthFrame>
  )
}
