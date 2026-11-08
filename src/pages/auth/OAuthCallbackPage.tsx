import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { completeLogin, takeRedirect, WithdrawnAccountError } from '@/lib/auth'
import { getHomePath, useAuthStore } from '@/lib/authStore'
import { AuthFrame } from '@/pages/auth/components/AuthFrame'
import { Spinner } from '@/ui/Spinner'
import { toast } from '@/ui/toastStore'

// 로그인 처리: Supabase 세션이 생긴 뒤(code 교환 · SIGNED_IN) me 를 불러온다 → 돌아갈 주소(초대 링크) / 역할 선택 / 역할 홈
export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const setPendingRole = useAuthStore((state) => state.setPendingRole)

  useEffect(() => {
    let cancelled = false
    const run = () =>
      completeLogin()
        .then((me) => {
          if (cancelled) return
          // 로그인 취소 · 실패 (세션이 안 생김)
          if (!me) {
            toast.error('로그인하지 못했어요. 다시 시도해 주세요')
            navigate('/login', { replace: true })
            return
          }
          const next = takeRedirect()
          // 초대 링크로 왔으면 역할 선택을 건너뛰고 바로 입장
          if (next?.startsWith('/staff/join')) setPendingRole('staff')
          navigate(next ?? getHomePath(me), { replace: true })
        })
        .catch((error) => {
          if (cancelled) return
          // 탈퇴한 계정 → 로그아웃됐으니 로그인 화면으로
          if (error instanceof WithdrawnAccountError) {
            toast.error('탈퇴한 계정이에요. 다른 계정으로 로그인해 주세요')
            navigate('/login', { replace: true })
            return
          }
          // me 를 못 불러옴 (BE 꺼짐 · 계속 401 등) → 이 화면에 머물며 다시 시도
          toast.error('정보를 불러오지 못했어요. 다시 시도해 주세요', { onRetry: run })
        })
    run()
    return () => {
      cancelled = true
    }
  }, [navigate, setPendingRole])

  return (
    <AuthFrame className="items-center justify-center gap-2">
      <Spinner className="py-0" label="로그인하는 중" />
      <p className="m-0 text-[15px] font-semibold text-subtle">로그인하는 중이에요</p>
    </AuthFrame>
  )
}
