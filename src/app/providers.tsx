import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthBootstrap } from '@/app/AuthBootstrap'
import {
  ERROR_MESSAGE,
  errorMessage,
  handleUnauthorized,
  isNotFound,
  isUnauthorized,
  retryDelay,
  shouldRetry,
} from '@/lib/api/errors'
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

const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (isUnauthorized(error)) return void handleUnauthorized()
      if (isNotFound(error)) return
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

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>{children}</AuthBootstrap>
    </QueryClientProvider>
  )
}
