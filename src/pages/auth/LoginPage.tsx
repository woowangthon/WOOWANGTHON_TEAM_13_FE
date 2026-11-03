import { Coffee, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { rememberRedirect, signIn, type OAuthProvider } from '@/lib/auth'
import { getHomePath, useAuthStore } from '@/lib/authStore'
import loginPhoto from '@/pages/auth/assets/login-photo.webp'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
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

  if (isReady && isLoggedIn && me) return <Navigate to={from ?? getHomePath(me)} replace />

  const start = async (provider: OAuthProvider) => {
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
    <AuthFrame className="gap-[22px]">
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
          AI 사수
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
        {/* 카카오 노란색(#FEE500)은 나현에게 Button kakao 종류를 요청해 둠. 생기기 전까지 연한 회색 */}
        <Button
          variant="soft"
          className="h-14 gap-2.5 rounded-[18px] text-base font-bold"
          disabled={pending !== null}
          onClick={() => start('kakao')}
        >
          {pending === 'kakao' ? <LoaderCircle className="size-5 animate-spin" /> : <KakaoLogo />}
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
            <GoogleLogo />
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

// 카카오 말풍선 로고
function KakaoLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3C6.48 3 2 6.5 2 10.82c0 2.8 1.87 5.25 4.68 6.63-.2.73-.74 2.67-.85 3.08-.13.51.19.5.39.37.16-.11 2.55-1.73 3.58-2.43.72.1 1.45.16 2.2.16 5.52 0 10-3.5 10-7.81C22 6.5 17.52 3 12 3z"
      />
    </svg>
  )
}

// 구글 로고 (구글 브랜드 가이드 색)
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-[19px]" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}
