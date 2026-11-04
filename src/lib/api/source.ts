import { apiFetch } from '@/lib/apiClient'
import { env } from '@/lib/env'

/*
 * 진짜 API / 가짜 서버 스위치 — 담당: 민지
 * BE API 가 기능별로 하나씩 나오니, .env 의 VITE_REAL_API 에 켠 기능만 진짜 API(apiFetch)를 부른다.
 *   VITE_REAL_API=users,invitations   → 두 기능만 진짜, 나머지는 가짜 서버
 *   VITE_REAL_API=all                 → 모두 진짜
 *   비워 두면                          → 모두 가짜 서버 (기본)
 * 기능 이름은 src/lib/api 의 훅 파일 이름과 같다. 경로 · 응답 모양: docs/07
 */

export const API_FEATURES = [
  'users',
  'invitations',
  'recipes',
  'manuals',
  'assistantChat',
  'handover',
  'schedule',
  'payroll',
] as const

export type ApiFeature = (typeof API_FEATURES)[number]

/** 이 기능을 진짜 API 로 부르는지 */
export function isRealApi(feature: ApiFeature) {
  return env.realApi.has('all') || env.realApi.has(feature)
}

const withBody = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
})

/** 진짜 API 호출 (JSON). 실패하면 apiFetch 가 ApiError 를 던진다 → 공통 에러 처리 */
export const http = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, withBody('POST', body)),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, withBody('PATCH', body)),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}

// 개발 중에 어떤 기능이 진짜 API 인지 콘솔에 한 번 알려 준다 (이름을 잘못 적으면 경고)
if (import.meta.env.DEV && env.realApi.size > 0) {
  const unknown = [...env.realApi].filter(
    (name) => name !== 'all' && !(API_FEATURES as readonly string[]).includes(name),
  )
  console.info('[API] 진짜 API:', [...env.realApi].join(', '))
  if (unknown.length) console.warn('[API] VITE_REAL_API 에 없는 기능 이름:', unknown.join(', '))
}
