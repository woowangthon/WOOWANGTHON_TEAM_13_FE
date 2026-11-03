import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { restoreSession, takeRedirect } from '@/lib/auth'
import { getHomePath, useAuthStore } from '@/lib/authStore'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { Spinner } from '@/ui/Spinner'
import { toast } from '@/ui/toastStore'

// 로그인 처리: 세션 확인(AuthBootstrap)이 끝나면 → 돌아갈 주소(초대 링크) / 역할 선택 / 역할 홈
export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const isReady = useAuthStore((state) => state.isReady)
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const me = useAuthStore((state) => state.me)
  const setPendingRole = useAuthStore((state) => state.setPendingRole)
  const done = useRef(false)

  useEffect(() => {
    if (!isReady || done.current) return

    // 로그인 취소 · 실패
    if (!isLoggedIn) {
      done.current = true
      toast.error('로그인하지 못했어요. 다시 시도해 주세요')
      navigate('/login', { replace: true })
      return
    }

    // me 를 못 불러옴 → 다시 시도 (성공하면 me 가 바뀌어 이 effect 가 다시 돈다)
    if (!me) {
      const showRetry = () =>
        toast.error('정보를 불러오지 못했어요. 다시 시도해 주세요', {
          onRetry: () => restoreSession().catch(showRetry),
        })
      showRetry()
      return
    }

    done.current = true
    const next = takeRedirect()
    // 초대 링크로 왔으면 역할 선택을 건너뛰고 바로 입장
    if (next?.startsWith('/staff/join')) setPendingRole('staff')
    navigate(next ?? getHomePath(me), { replace: true })
  }, [isReady, isLoggedIn, me, navigate, setPendingRole])

  return (
    <AuthFrame className="items-center justify-center gap-2">
      <Spinner className="py-0" label="로그인하는 중" />
      <p className="m-0 text-[15px] font-semibold text-subtle">로그인하는 중이에요</p>
    </AuthFrame>
  )
}
