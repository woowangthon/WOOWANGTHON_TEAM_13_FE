import { LoaderCircle, MessageCircle, MessagesSquare } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { READY_PROVIDERS, rememberRedirect, signIn, type OAuthProvider } from '@/lib/auth'
import { getHomePath, useAuthStore } from '@/lib/authStore'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { toast } from '@/ui/toastStore'

// 로그인: 구글 · 카카오(설정 전이라 준비 중) → Supabase → /auth/callback
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

  const kakaoReady = READY_PROVIDERS.includes('kakao')

  return (
    <AuthFrame className="justify-between gap-8">
      <section className="flex flex-1 flex-col justify-center">
        <Card variant="dark" className="gap-5 px-6 py-8">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/15">
            <MessagesSquare className="size-6" />
          </span>
          <div>
            <p className="m-0 text-sm font-semibold text-white/70">신입 알바생의 든든한 선배</p>
            <h1 className="m-0 mt-1 text-[28px] leading-tight font-extrabold">AI 사수</h1>
          </div>
          <p className="m-0 text-[15px] leading-relaxed text-white/85">
            우리 매장 매뉴얼 · 레시피로 답해 줘요.
            <br />
            모르는 건 지어내지 않고 사장님께 물어봐요.
          </p>
        </Card>
      </section>

      <section className="flex flex-col gap-2.5">
        <Button
          variant="white"
          size="xl"
          className="shadow-soft"
          disabled={pending !== null}
          onClick={() => start('google')}
        >
          {pending === 'google' ? <LoaderCircle className="size-5 animate-spin" /> : <GoogleLogo />}
          Google로 시작하기
        </Button>
        {/* 카카오 노란색(#FEE500)은 나현에게 Button kakao 종류를 요청해 둠. 그 전까지 회색 */}
        <Button
          variant="soft"
          size="xl"
          className="text-faint"
          disabled={!kakaoReady || pending !== null}
          onClick={() => start('kakao')}
        >
          <MessageCircle className="size-5" fill="currentColor" />
          카카오로 시작하기
          {!kakaoReady && (
            <Badge variant="muted" size="sm">
              준비 중
            </Badge>
          )}
        </Button>
        <p className="m-0 mt-1 text-center text-xs text-subtle">
          로그인하면 우리 매장 매뉴얼과 AI 사수를 쓸 수 있어요
        </p>
      </section>
    </AuthFrame>
  )
}

// 구글 로고 (구글 브랜드 가이드 색)
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
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
