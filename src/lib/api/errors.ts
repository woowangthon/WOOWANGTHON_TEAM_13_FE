import { ApiError, NETWORK_ERROR_STATUS } from '@/lib/apiClient'
import { isAuthCallbackPath, signOut } from '@/lib/auth'
import { toast } from '@/ui/toastStore'

/*
 * API 에러 공통 처리 — 담당: 민지
 * - 401(로그인 만료): 로그아웃 → 화면 보호(guards)가 /login 으로 보낸다
 * - 서버에 닿지 못함: "서버에 연결하지 못했어요" 안내
 * - 그 밖의 실패: 빨간 토스트 + 다시 시도
 * 불러오기(query) 실패는 src/app/providers.tsx 의 QueryCache 가 한곳에서 토스트를 띄운다.
 * 저장 · 전송(mutation)은 각 훅이 toastApiError 로 띄운다 (401 은 MutationCache 가 처리).
 */

export const ERROR_MESSAGE = {
  load: '불러오지 못했어요. 다시 시도해 주세요',
  network: '서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요',
  expired: '로그인이 만료됐어요. 다시 로그인해 주세요',
  busy: '지금 사용하는 사람이 많아요. 잠시 뒤 다시 시도해 주세요',
} as const

const statusOf = (error: unknown) => (error instanceof ApiError ? error.status : undefined)

export const isUnauthorized = (error: unknown) => statusOf(error) === 401
export const isNotFound = (error: unknown) => statusOf(error) === 404
export const isNetworkError = (error: unknown) => statusOf(error) === NETWORK_ERROR_STATUS
/** 서버가 잠깐 바쁨: 503 (BE 는 DB 연결이 꽉 차면 503 { code: "DATABASE_BUSY" }) */
export const isServerBusy = (error: unknown) => statusOf(error) === 503
const isDatabaseBusy = (error: unknown) =>
  error instanceof ApiError && error.code === 'DATABASE_BUSY'

/** 보여 줄 문장: 서버 연결 실패 → 연결 안내, 4xx 는 BE 문장(있으면), 나머지는 화면이 정한 문장 */
export function errorMessage(error: unknown, fallback: string) {
  if (isNetworkError(error)) return ERROR_MESSAGE.network
  if (isDatabaseBusy(error)) return ERROR_MESSAGE.busy
  const status = statusOf(error)
  if (error instanceof ApiError && status && status >= 400 && status < 500 && error.serverMessage) {
    return error.serverMessage
  }
  return fallback
}

/** 503(서버 바쁨) 재시도 횟수 · 간격: 1초 → 2초 → 4초 */
const BUSY_RETRIES = 3

/**
 * 조회(query) 재시도: 4xx(없음 · 권한 · 입력 오류)는 다시 해도 같으니 안 하고,
 * 503(DB 바쁨 등)은 최대 3번, 그 밖의 5xx · 연결 실패는 1번. 저장 · 전송(mutation)은 중복 저장 위험이 있어 재시도하지 않는다.
 * 에러 토스트는 QueryCache.onError 가 재시도가 다 끝난 마지막 실패에만 한 번 띄운다
 */
export function shouldRetry(failureCount: number, error: unknown) {
  const status = statusOf(error)
  if (status !== undefined && status >= 400 && status < 500) return false
  if (isServerBusy(error)) return failureCount < BUSY_RETRIES
  return failureCount < 1
}

/** 재시도 간격: 503 은 1초 · 2초 · 4초, 그 밖은 TanStack 기본(1초부터 두 배, 최대 30초) */
export function retryDelay(attemptIndex: number, error: unknown) {
  const delay = 1000 * 2 ** attemptIndex
  return isServerBusy(error) ? delay : Math.min(delay, 30_000)
}

let signingOut = false

/** 로그인 만료: 한 번만 로그아웃하고 안내 (동시에 여러 요청이 401 이어도). 로그인 처리 화면에서는 로그아웃하지 않는다 */
export async function handleUnauthorized() {
  if (signingOut || isAuthCallbackPath()) return
  signingOut = true
  try {
    await signOut()
    toast.error(ERROR_MESSAGE.expired)
  } finally {
    signingOut = false
  }
}

/** 저장 · 전송 실패 토스트 (401 은 공통 처리가 하므로 건너뜀) */
export function toastApiError(error: unknown, fallback: string, onRetry?: () => void) {
  if (isUnauthorized(error)) return
  toast.error(errorMessage(error, fallback), { onRetry })
}
