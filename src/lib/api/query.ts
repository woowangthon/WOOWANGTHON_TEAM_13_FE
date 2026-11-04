import { useEffect } from 'react'
import { ApiError } from '@/lib/apiClient'
import { toast } from '@/ui/toastStore'

// 훅 공통: 재시도 규칙 · 에러 토스트

/** 404(없음)는 다시 불러와도 같으니 재시도하지 않는다. 나머지는 1번 */
export function retryExceptNotFound(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status === 404) return false
  return failureCount < 1
}

export function isNotFound(error: unknown) {
  return error instanceof ApiError && error.status === 404
}

/** 불러오기 실패하면 빨간 토스트 + 다시 시도 (404 는 화면이 따로 처리) */
export function useQueryErrorToast(
  query: { isError: boolean; error: unknown; refetch: () => unknown },
  message = '불러오지 못했어요. 다시 시도해 주세요',
) {
  // TanStack Query 의 refetch 는 렌더마다 같은 함수라 deps 에 넣어도 토스트가 반복되지 않는다
  const { refetch } = query
  const show = query.isError && !isNotFound(query.error)

  useEffect(() => {
    if (show) toast.error(message, { onRetry: () => refetch() })
  }, [show, message, refetch])
}
