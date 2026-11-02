import { getAccessToken } from '@/lib/auth'
import { env } from '@/lib/env'

/*
 * 서버 호출 기본 — 담당: 민지
 * - 모든 요청에 Supabase access_token 을 Authorization: Bearer 로 붙인다.
 * - orval 자동 생성 코드(src/api/generated)도 이 함수(apiFetch)를 통해 요청한다.
 */

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, data: unknown) {
    super(`API 요청 실패 (${status})`)
    this.status = status
    this.data = data
  }
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${env.apiUrl}${url}`, { ...options, headers })
  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) throw new ApiError(response.status, data)
  return data as T
}
