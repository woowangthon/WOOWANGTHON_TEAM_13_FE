import { createClient, type Session } from '@supabase/supabase-js'
import { mockMe } from '@/api/mocks/staff/me'
import { useAuthStore, type Me } from '@/lib/authStore'
import { env } from '@/lib/env'

/*
 * 로그인 — 담당: 민지
 * 방식: Supabase Auth(카카오 · 구글) → access_token 을 BE(FastAPI)에 Bearer 로 보낸다.
 * 로그인 관련 코드는 이 파일에만 둔다. 다른 파일은 아래 함수만 불러 쓴다.
 */

export const supabase =
  env.supabaseUrl && env.supabasePublishableKey
    ? createClient(env.supabaseUrl, env.supabasePublishableKey)
    : null

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
  useAuthStore.getState().reset()
  rememberRedirect(null)
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

/*
 * 로그인 뒤 돌아갈 주소 (예: 초대 링크 /staff/join?code=…)
 * 구글 · 카카오 로그인 화면에 다녀오면 앱 상태가 사라지므로 sessionStorage 에 둔다.
 */
const REDIRECT_KEY = 'after-login'

export function rememberRedirect(path: string | null) {
  if (path) sessionStorage.setItem(REDIRECT_KEY, path)
  else sessionStorage.removeItem(REDIRECT_KEY)
}

export function takeRedirect(): string | null {
  const path = sessionStorage.getItem(REDIRECT_KEY)
  sessionStorage.removeItem(REDIRECT_KEY)
  return path
}

/** GET /me — 응답 모양이 정해지기 전까지는 가짜 데이터 */
export async function fetchMe(): Promise<Me> {
  const session = await getSession()
  if (!session) throw new Error('로그인이 필요해요')
  // TODO: BE 응답 모양이 정해지면 apiFetch<Me>('/me') 로 바꾼다
  const { user } = session
  const nickname: string = user.user_metadata.full_name ?? user.user_metadata.name ?? '사용자'
  return mockMe(user.id, nickname)
}

/** me 를 다시 불러온다 (매장 입장 · 생성 뒤) */
export async function refreshMe() {
  useAuthStore.getState().setMe(await fetchMe())
}

/** 세션을 확인하고 me 를 불러와 useAuthStore 에 넣는다. me 를 못 불러오면 에러를 던진다 */
export async function restoreSession() {
  const { setLoggedIn, setProvider, setMe } = useAuthStore.getState()
  const session = await getSession()
  setLoggedIn(Boolean(session))
  setProvider(session?.user.app_metadata.provider ?? null)
  setMe(session ? await fetchMe() : null)
}
