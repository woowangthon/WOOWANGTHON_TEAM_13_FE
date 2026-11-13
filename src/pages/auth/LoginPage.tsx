import { LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { rememberRedirect, signIn, type OAuthProvider } from '@/lib/auth'
import { getHomePath, useAuthStore } from '@/lib/authStore'
import { wakeServer } from '@/lib/wakeServer'
import loginPhoto from '@/pages/auth/assets/login-photo.webp'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { LoginShowcase } from '@/pages/auth/components/LoginShowcase'
import { ProviderLogo } from '@/pages/auth/components/ProviderLogo'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 로그인 (디자인: docs/design/login-onboarding.html): 위 crewBean 로고 → 매장 사진 카드(큰 카피 34px, docs/08 예외) → 카카오 · 구글
// 카카오는 카카오 규정 노란색(ui/Button kakao) 그대로, 구글은 흰 버튼 + 옅은 테두리 (흰 바탕 위 구분)
// 데스크톱(lg 1024px 이상, 11/14 나현 · 민지 OK): 왼쪽 패널에 헤드라인 · 설명 · 버튼 · 약관, 오른쪽에 AI 사수 대화 미리보기(LoginShowcase)
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
    <AuthFrame
      tone="white"
      className="gap-6"
      aside={<DesktopIntro pending={pending} onStart={start} />}
      showcase={<LoginShowcase />}
    >
      {/* 글자 로고 (public/logo-crewbean.png, 사장님 화면과 같은 그림) · 첫 화면이라 높이 36px */}
      <img
        src="/logo-crewbean.png"
        alt="crewBean"
        width={528}
        height={120}
        className="mt-1 h-9 w-auto self-start"
      />

      <section className="relative isolate flex min-h-[380px] flex-1 flex-col justify-end overflow-hidden rounded-3xl p-6 text-white">
        <img src={loginPhoto} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(40,44,28,0.25)_0%,rgba(40,44,28,0.1)_35%,rgba(40,44,28,0.88)_88%)]"
        />
        <div className="flex flex-col gap-2">
          {/* 슬로건은 글자 그대로. 줄바꿈은 보기용(가장 긴 줄 276px, 360px 카드 안 280px 에 들어감),
              화면 읽기는 aria-label 로 한 문장 */}
          <h1
            aria-label="혼자 막막했던 근무를 함께하는 크루로, crewBean"
            className="m-0 text-[34px] leading-[1.22] font-extrabold tracking-[-0.035em]"
          >
            혼자 막막했던 근무를 <br />
            함께하는 크루로, <br />
            crewBean
          </h1>
          <p className="m-0 text-[15px] font-medium text-white/85">
            레시피 · 매뉴얼 · 인수인계 · 근무
          </p>
        </div>
      </section>

      <LoginActions pending={pending} onStart={start} />
    </AuthFrame>
  )
}

type StartProps = { pending: OAuthProvider | null; onStart: (provider: OAuthProvider) => void }

/** 데스크톱 왼쪽 패널: 헤드라인 42px(docs/08 예외) · 설명 · 버튼 · 약관 */
function DesktopIntro({ pending, onStart }: StartProps) {
  return (
    <div className="flex flex-col gap-7">
      <h1
        aria-label="혼자 막막했던 근무를 함께하는 크루로, crewBean"
        className="m-0 text-[42px] leading-[1.25] font-extrabold tracking-[-1.5px] break-keep text-[#373d20]"
      >
        혼자 막막했던 근무를 <br />
        함께하는 크루로, <br />
        crewBean
      </h1>
      <p className="m-0 text-base leading-[1.7] break-keep text-[#4a5340]">
        사장님은 레시피 · 매뉴얼을 올리고, 알바생은 근무 중에 바로 물어봐요. 매뉴얼에 없으면 AI가
        지어내지 않고 사장님께 넘겨요.
      </p>
      <LoginActions pending={pending} onStart={onStart} desktop />
    </div>
  )
}

/** 카카오 · 구글 버튼 + 약관 문구. 휴대폰은 56px 버튼, 데스크톱은 60px · 17px */
function LoginActions({ pending, onStart, desktop = false }: StartProps & { desktop?: boolean }) {
  return (
    <section className={cn('flex flex-col', desktop ? 'gap-3' : 'gap-2')}>
      <Button
        variant="kakao"
        className={cn(
          'gap-2.5',
          desktop ? 'h-15 text-[17px] font-extrabold text-[#191600]' : 'h-14 text-base',
        )}
        disabled={pending !== null}
        onClick={() => onStart('kakao')}
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
        className={cn(
          'gap-2.5',
          desktop ? 'h-15 text-[17px] font-extrabold' : 'h-14 border border-line/60 text-base',
        )}
        disabled={pending !== null}
        onClick={() => onStart('google')}
      >
        {pending === 'google' ? (
          <LoaderCircle className="size-5 animate-spin text-brand" />
        ) : (
          <ProviderLogo provider="google" size={19} />
        )}
        Google로 시작하기
      </Button>
      {/* 이용약관 · 개인정보처리방침 페이지가 생기면 링크로 바꾼다 */}
      <p
        className={cn(
          'm-0 px-2 pt-2 text-center text-xs leading-[1.45] font-medium text-balance',
          desktop ? 'text-[#5b6350]' : 'text-subtle',
        )}
      >
        시작하면{' '}
        <span className={cn('underline underline-offset-2', !desktop && 'text-muted-foreground')}>
          이용약관
        </span>{' '}
        ·{' '}
        <span className={cn('underline underline-offset-2', !desktop && 'text-muted-foreground')}>
          개인정보처리방침
        </span>
        에 동의한 것으로 봐요
      </p>
    </section>
  )
}
