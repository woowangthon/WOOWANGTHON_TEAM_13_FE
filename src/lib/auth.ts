import { createClient, type Session } from '@supabase/supabase-js'
import { env } from '@/lib/env'

/*
 * 로그인 — 담당: 민지
 * 방식: Supabase Auth(카카오 · 구글) → access_token 을 BE(FastAPI)에 Bearer 로 보낸다.
 * 로그인 관련 코드는 이 파일에만 둔다. 다른 파일은 아래 함수만 불러 쓴다.
 */

export const supabase =
  env.supabaseUrl && env.supabaseAnonKey ? createClient(env.supabaseUrl, env.supabaseAnonKey) : null

export type OAuthProvider = 'kakao' | 'google'

export async function signIn(provider: OAuthProvider) {
  if (!supabase) throw new Error('Supabase 설정(.env)이 비어 있어요')
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      // 카카오는 닉네임만 받는다 (이메일은 비즈앱 전환이 필요)
      scopes: provider === 'kakao' ? 'profile_nickname' : undefined,
    },
  })
  if (error) throw error
}

export async function signOut() {
  await supabase?.auth.signOut()
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession()
  return session?.access_token ?? null
}

export function onAuthChange(callback: (session: Session | null) => void) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}
