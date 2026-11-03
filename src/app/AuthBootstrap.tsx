import { useEffect, type ReactNode } from 'react'
import { onAuthChange, restoreSession } from '@/lib/auth'
import { useAuthStore } from '@/lib/authStore'

/*
 * 앱 시작 시 로그인 확인 — 담당: 민지
 * Supabase 세션을 확인하고 me 를 불러온다. 끝나기 전까지 화면 보호(guards)는 Spinner 를 보여 준다.
 * me 를 못 불러오면 me 는 null 로 남고, 로그인 처리 화면(/auth/callback)이 다시 시도를 띄운다.
 */
export function AuthBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    const { setReady, reset } = useAuthStore.getState()
    restoreSession()
      .catch(() => {})
      .finally(() => setReady(true))
    return onAuthChange((session) => {
      if (!session) reset()
    })
  }, [])

  return children
}
