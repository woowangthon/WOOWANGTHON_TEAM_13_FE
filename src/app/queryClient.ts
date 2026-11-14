import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import {
  ERROR_MESSAGE,
  errorMessage,
  handleUnauthorized,
  isNotFound,
  isUnauthorized,
  retryDelay,
  shouldRetry,
} from '@/lib/api/errors'
import { userKeys } from '@/lib/api/users'
import { ApiError } from '@/lib/apiClient'
import { toast } from '@/ui/toastStore'

/*
 * 서버 데이터 공통 설정 — 담당: 민지 (에러 규칙: src/lib/api/errors.ts)
 * - 불러오기 실패: 빨간 토스트 + 다시 시도 (404 는 화면이 목록으로 돌려보내는 등 따로 처리)
 *   재시도(shouldRetry · retryDelay)가 다 끝난 마지막 실패에만 토스트 한 번 — 503(DB 바쁨)은 1초 · 2초 · 4초로 3번 다시 시도
 * - 401: 로그아웃 → /login (불러오기 · 저장 모두)
 */
// 쿼리 meta 에 쓸 수 있는 값 (타입 검사용)
declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: {
      /** true 면 실패해도 공통 에러 토스트를 띄우지 않는다 (화면이 대체 문구로 처리) */
      silent?: boolean
    }
  }
}

/** 앱 하나의 쿼리 캐시 — 로그아웃 · 탈퇴 때 lib/auth signOut 이 비운다 */
export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (isUnauthorized(error)) return void handleUnauthorized()
      if (isNotFound(error)) {
        // 매장이 지워졌으면(사장님이 삭제) 내 매장 목록을 다시 받아 알바 화면이 다른 매장 · 역할 선택으로 가게 (토스트 없음)
        if (error instanceof ApiError && error.code === 'STORE_NOT_FOUND') {
          void queryClient.invalidateQueries({ queryKey: userKeys.myStores })
        }
        return
      }
      // 실패해도 화면이 대체 내용을 조용히 보여 주는 조회 (예: 하루 인수인계 AI 요약). 401 로그아웃은 위에서 그대로
      if (query.meta?.silent) return
      toast.error(errorMessage(error, ERROR_MESSAGE.load), {
        onRetry: () => queryClient.refetchQueries({ queryKey: query.queryKey }),
      })
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isUnauthorized(error)) void handleUnauthorized()
    },
  }),
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      retryDelay,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})
