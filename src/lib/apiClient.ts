import { getAccessToken } from '@/lib/auth'
import { env } from '@/lib/env'

/*
 * 서버 호출 기본 — 담당: 민지
 * - 모든 요청에 Supabase access_token 을 Authorization: Bearer 로 붙인다.
 * - orval 자동 생성 코드(src/api/generated)도 이 함수(apiFetch)를 통해 요청한다.
 * - 실패하면 ApiError 를 던진다. 서버에 닿지 못하면(꺼짐 · 인터넷 끊김) status 0 (NETWORK_ERROR).
 *   401 · 토스트 같은 공통 처리는 src/lib/api/errors.ts 와 src/app/providers.tsx 에서 한다.
 */

/** BE 에러 응답 모양 (docs/07 0-1) */
export interface ApiErrorBody {
  code: string
  message: string
  detail: unknown
}

/** 서버에 닿지 못했을 때의 status */
export const NETWORK_ERROR_STATUS = 0

function isErrorBody(data: unknown): data is ApiErrorBody {
  return typeof data === 'object' && data !== null && 'code' in data && 'message' in data
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, data: unknown) {
    super(`API 요청 실패 (${status})`)
    this.status = status
    this.data = data
  }

  /** BE 에러 코드 (예: INVITE_INVALID). 모양이 다르면 undefined */
  get code(): string | undefined {
    return isErrorBody(this.data) ? this.data.code : undefined
  }

  /** BE 가 준 사용자용 문장 ("~해요"). 모양이 다르면 undefined */
  get serverMessage(): string | undefined {
    return isErrorBody(this.data) ? this.data.message : undefined
  }
}

function parseBody(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text // JSON 이 아닌 응답 (예: 게이트웨이 오류 HTML)
  }
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(`${env.apiUrl}${url}`, { ...options, headers })
  } catch {
    throw new ApiError(NETWORK_ERROR_STATUS, {
      code: 'NETWORK_ERROR',
      message: '서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요',
      detail: null,
    } satisfies ApiErrorBody)
  }

  const data = parseBody(await response.text())
  if (!response.ok) throw new ApiError(response.status, data)
  return data as T
}
