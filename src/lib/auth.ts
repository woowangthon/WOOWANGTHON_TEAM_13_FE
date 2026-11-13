import { createClient, type Session } from '@supabase/supabase-js'
import { useAuthStore, type LoginProvider, type Me } from '@/lib/authStore'
import { fetchMe as getMe } from '@/lib/api/users'
import { http, isRealApi } from '@/lib/api/source'
import { env } from '@/lib/env'
import { wakeServer } from '@/lib/wakeServer'

/*
 * 로그인 — 담당: 민지
 * 방식: Supabase Auth(카카오 · 구글) → access_token 을 BE(FastAPI)에 Bearer 로 보낸다.
 * 로그인 관련 코드는 이 파일에만 둔다. 다른 파일은 아래 함수만 불러 쓴다.
 */

export const supabase =
  env.supabaseUrl && env.supabasePublishableKey
    ? createClient(env.supabaseUrl, env.supabasePublishableKey)
    : null

export type OAuthProvider = LoginProvider

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
  const { disablePushNotifications } = await import('@/lib/pushNotifications')
  await disablePushNotifications().catch(() => {})
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

/** 로그인 정보로 GET /users/me 를 불러온다 (응답 모양 확정 11/4, docs/07 1-1 · src/lib/api/users) */
export async function fetchMe(): Promise<Me> {
  const session = await getSession()
  if (!session) throw new Error('로그인이 필요해요')
  const { user } = session
  const nickname: string = user.user_metadata.full_name ?? user.user_metadata.name ?? '사용자'
  return getMe({
    userId: user.id,
    nickname,
    email: user.email ?? null,
    provider: user.app_metadata.provider === 'google' ? 'google' : 'kakao',
  })
}

/** 탈퇴한 계정: BE 는 탈퇴 뒤에도 같은 로그인으로 오면 GET /users/me 를 403 으로 막는다 */
const isWithdrawnError = (error: unknown) => (error as { status?: unknown }).status === 403

export class WithdrawnAccountError extends Error {
  constructor() {
    super('탈퇴한 계정이에요')
  }
}

/** 회원 탈퇴 — DELETE /users/me (204) 뒤 로그아웃. 가짜 서버면 로그아웃만 */
export async function withdrawAccount() {
  if (isRealApi('users')) await http.delete<void>('/users/me')
  await signOut()
}

/** me 를 다시 불러온다 (매장 입장 · 생성 · 이름 바꾸기 뒤) */
export async function refreshMe() {
  useAuthStore.getState().setMe(await fetchMe())
}

/** 세션을 확인하고 me 를 불러와 useAuthStore 에 넣는다. 세션이 없으면 /users/me 를 부르지 않는다. me 를 못 불러오면 에러를 던진다 */
export async function restoreSession() {
  const { setLoggedIn, setMe } = useAuthStore.getState()
  const session = await getSession()
  setLoggedIn(Boolean(session))
  if (!session) return setMe(null)
  // 앱 첫 진입 · 로그인 상태: 잠든 서버를 먼저 깨운다 (me 요청과 같이 출발)
  wakeServer()
  try {
    setMe(await fetchMe())
  } catch (error) {
    // 탈퇴한 계정이면 Supabase 세션도 끊어서 로그인 화면으로
    if (isWithdrawnError(error)) await signOut()
    throw error
  }
}

/** 로그인 처리 화면(/auth/callback)인지 — 이 화면에서는 401 이 나도 로그아웃하지 않는다 */
export const isAuthCallbackPath = () => window.location.pathname.startsWith('/auth/callback')

/**
 * 세션이 생길 때까지 기다린다. 로그인 처리 화면에서는 Supabase 가 주소의 code 를 토큰으로 바꾸는 중일 수 있어서
 * 바로 있으면 그걸 쓰고, 없으면 SIGNED_IN(· INITIAL_SESSION) 이벤트를 기다린다. 시간 안에 안 생기면 null (로그인 취소 · 실패)
 */
export function waitForSession(timeoutMs = 10_000): Promise<Session | null> {
  const client = supabase
  if (!client) return Promise.resolve(null)
  return new Promise((resolve) => {
    let settled = false
    let unsubscribe = () => {}
    const finish = (session: Session | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      unsubscribe()
      resolve(session)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) finish(session)
    })
    unsubscribe = () => data.subscription.unsubscribe()
    void getSession().then((session) => {
      if (session) finish(session)
    })
  })
}

/**
 * 막 받은 토큰은 몇 초 동안 401 일 수 있다: 이 컴퓨터 시계가 Supabase 보다 늦으면
 * BE(PyJWT)가 발급 시각(iat)이 미래라고 거절한다 (11/7 확인: 약 2초). 로그인 처리 중에만 401 을 잠깐 뒤 다시 시도한다
 */
const LOGIN_401_RETRY_MS = [1000, 2000, 3000]

async function fetchMeAfterLogin(): Promise<Me> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchMe()
    } catch (error) {
      const status = (error as { status?: unknown }).status
      if (status !== 401 || attempt >= LOGIN_401_RETRY_MS.length) throw error
      await new Promise((resolve) => setTimeout(resolve, LOGIN_401_RETRY_MS[attempt]))
    }
  }
}

let loginInFlight: Promise<Me | null> | null = null

/**
 * 로그인 처리 화면: 세션이 확실히 생긴 뒤 me 를 불러와 useAuthStore 에 넣는다.
 * 세션이 안 생기면 null (로그인 취소 · 실패). 동시에 여러 번 불러도 한 번만 요청한다 (개발 모드 StrictMode 등)
 */
export function completeLogin(): Promise<Me | null> {
  loginInFlight ??= (async () => {
    const { setLoggedIn, setMe } = useAuthStore.getState()
    // 카카오 · 구글에서 돌아오면 페이지가 새로 열려서, 세션을 기다리는 동안 서버를 한 번 더 깨운다
    wakeServer()
    // 주소에 code(PKCE) · access_token(implicit)이 있으면 토큰 교환을 기다리고, 없으면(취소 · 에러) 짧게만 본다
    const hasAuthParams = /[?&#](code|access_token)=/.test(window.location.href)
    const session = await waitForSession(hasAuthParams ? 10_000 : 1500)
    setLoggedIn(Boolean(session))
    if (!session) {
      setMe(null)
      return null
    }
    try {
      const me = await fetchMeAfterLogin()
      setMe(me)
      return me
    } catch (error) {
      if (isWithdrawnError(error)) {
        await signOut()
        throw new WithdrawnAccountError()
      }
      throw error
    }
  })().finally(() => {
    loginInFlight = null
  })
  return loginInFlight
}
