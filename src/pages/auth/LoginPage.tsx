import { LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { rememberRedirect, signIn, type OAuthProvider } from '@/lib/auth'
import { getHomePath, useAuthStore } from '@/lib/authStore'
import logo from '@/assets/logo-crewbean.webp'
import { wakeServer } from '@/lib/wakeServer'
import loginPhoto from '@/pages/auth/assets/login-photo.webp'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { ProviderLogo } from '@/pages/auth/components/ProviderLogo'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toastStore'

// 로그인 (디자인: docs/design/login-onboarding.html): 위 crewBean 로고 → 매장 사진 카드(큰 카피 34px, docs/08 예외) → 카카오 · 구글
// 카카오는 카카오 규정 노란색(ui/Button kakao) 그대로, 구글은 흰 버튼 + 옅은 테두리 (흰 바탕 위 구분)
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
    <AuthFrame tone="white" className="gap-6">
      <img
        src={logo}
        alt="crewBean"
        width={451}
        height={144}
        className="mt-1 h-8 w-auto self-start"
      />

      <section className="relative isolate flex min-h-[380px] flex-1 flex-col justify-end overflow-hidden rounded-3xl p-6 text-white">
        <img src={loginPhoto} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(24,36,29,0.25)_0%,rgba(24,36,29,0.1)_35%,rgba(24,36,29,0.88)_88%)]"
        />
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[34px] leading-[1.22] font-extrabold tracking-[-0.035em]">
            매장 일,
            <br />
            묻고 바로 알기
          </h1>
          <p className="m-0 text-[15px] font-medium text-white/85">
            레시피 · 매뉴얼 · 인수인계 · 근무
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <Button
          variant="kakao"
          className="h-14 gap-2.5 text-base"
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
          className="h-14 gap-2.5 border border-line/60 text-base"
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
        <p className="m-0 px-2 pt-2 text-center text-xs leading-[1.45] font-medium text-balance text-subtle">
          시작하면{' '}
          <span className="text-muted-foreground underline underline-offset-2">이용약관</span> ·{' '}
          <span className="text-muted-foreground underline underline-offset-2">
            개인정보처리방침
          </span>
          에 동의한 것으로 봐요
        </p>
      </section>
    </AuthFrame>
  )
}
