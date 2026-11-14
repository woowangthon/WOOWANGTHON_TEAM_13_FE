import { getAccessToken } from '@/lib/auth'
import { env } from '@/lib/env'

/*
 * 서버 호출 기본 — 담당: 민지
 * - 모든 요청에 Supabase access_token 을 Authorization: Bearer 로 붙인다.
 * - orval 자동 생성 코드(src/api/generated)도 이 함수(apiFetch)를 통해 요청한다.
 * - 실패하면 ApiError 를 던진다. 서버에 닿지 못하면(꺼짐 · 인터넷 끊김) status 0 (NETWORK_ERROR).
 * - 에러 본문은 우리 약속 { code, message, detail } 과 FastAPI 기본 { detail } 둘 다 읽는다 (아래 normalizeErrorBody).
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
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as ApiErrorBody).code === 'string' &&
    typeof (data as ApiErrorBody).message === 'string'
  )
}

/** FastAPI 기본 에러에는 code 가 없어서 HTTP 상태로 공통 코드를 정한다 (docs/07 0-1) */
const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  500: 'INTERNAL_ERROR',
  503: 'SERVICE_UNAVAILABLE',
}

const hasHangul = (text: string) => /[가-힣]/.test(text)

/**
 * 에러 본문 → { code, message, detail }
 * - { code, message, detail }                  그대로 (우리 약속 · 초대코드 API)
 * - { detail: { code, message, detail } }      FastAPI HTTPException 에 우리 모양을 넣은 경우 → 안쪽
 * - { detail: "Store not found" }              code 는 상태로, message 는 한국어일 때만 (영어 문장은 화면에 안 보인다)
 * - { detail: [ { loc, msg, type } ] } (422)   VALIDATION_ERROR, detail 에 필드별 이유 그대로
 */
export function normalizeErrorBody(status: number, data: unknown): ApiErrorBody | null {
  if (isErrorBody(data)) return data
  if (typeof data !== 'object' || data === null || !('detail' in data)) return null
  const detail = (data as { detail: unknown }).detail
  if (isErrorBody(detail)) return detail
  const code = CODE_BY_STATUS[status] ?? `HTTP_${status}`
  if (typeof detail === 'string') {
    // 대문자 상수면 그 자체가 코드 (예: "INVITE_INVALID")
    if (/^[A-Z][A-Z0-9_]+$/.test(detail)) return { code: detail, message: '', detail: null }
    return { code, message: hasHangul(detail) ? detail : '', detail }
  }
  if (Array.isArray(detail)) return { code: 'VALIDATION_ERROR', message: '', detail }
  return { code, message: '', detail }
}

export class ApiError extends Error {
  status: number
  /** 서버가 준 본문 그대로 */
  data: unknown
  /** 본문을 { code, message, detail } 로 맞춘 것. 모양을 모르면 null */
  body: ApiErrorBody | null

  constructor(status: number, data: unknown) {
    super(`API 요청 실패 (${status})`)
    this.status = status
    this.data = data
    this.body = normalizeErrorBody(status, data)
  }

  /** BE 에러 코드 (예: INVITE_INVALID · NOT_FOUND). 모양을 모르면 undefined */
  get code(): string | undefined {
    return this.body?.code
  }

  /** BE 가 준 사용자용 한국어 문장 ("~해요"). 없거나 영어면 undefined → 화면 문구를 쓴다 */
  get serverMessage(): string | undefined {
    return this.body?.message || undefined
  }

  /** 추가 정보 (예: 이미 들어간 매장 · 잠금 해제 시각 · 422 필드별 이유) */
  get detail(): unknown {
    return this.body?.detail ?? null
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
