import { useEffect, type ReactNode } from 'react'
import { isAuthCallbackPath, onAuthChange, restoreSession } from '@/lib/auth'
import { useAuthStore } from '@/lib/authStore'

/*
 * 앱 시작 시 로그인 확인 — 담당: 민지
 * Supabase 세션을 확인하고, 세션이 있을 때만 me(GET /users/me)를 불러온다. 끝나기 전까지 화면 보호(guards)는 Spinner.
 * 로그인 처리 화면(/auth/callback)은 세션이 생기는 중이라 여기서 부르지 않고, 그 화면이 completeLogin 으로 직접 한다.
 * me 를 못 불러오면 me 는 null 로 남는다.
 */
export function AuthBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    const { setReady, reset } = useAuthStore.getState()
    if (isAuthCallbackPath()) setReady(true)
    else
      restoreSession()
        .catch(() => {})
        .finally(() => setReady(true))
    return onAuthChange((session) => {
      if (!session) reset()
    })
  }, [])

  return children
}
