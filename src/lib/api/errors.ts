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
} as const

const statusOf = (error: unknown) => (error instanceof ApiError ? error.status : undefined)

export const isUnauthorized = (error: unknown) => statusOf(error) === 401
export const isNotFound = (error: unknown) => statusOf(error) === 404
export const isNetworkError = (error: unknown) => statusOf(error) === NETWORK_ERROR_STATUS

/** 보여 줄 문장: 서버 연결 실패 → 연결 안내, 4xx 는 BE 문장(있으면), 나머지는 화면이 정한 문장 */
export function errorMessage(error: unknown, fallback: string) {
  if (isNetworkError(error)) return ERROR_MESSAGE.network
  const status = statusOf(error)
  if (error instanceof ApiError && status && status >= 400 && status < 500 && error.serverMessage) {
    return error.serverMessage
  }
  return fallback
}

/** 재시도: 4xx(없음 · 권한 · 입력 오류)는 다시 해도 같으니 안 하고, 연결 실패 · 5xx 는 1번 */
export function shouldRetry(failureCount: number, error: unknown) {
  const status = statusOf(error)
  if (status !== undefined && status >= 400 && status < 500) return false
  return failureCount < 1
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
