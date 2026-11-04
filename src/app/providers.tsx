import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthBootstrap } from '@/app/AuthBootstrap'
import {
  ERROR_MESSAGE,
  errorMessage,
  handleUnauthorized,
  isNotFound,
  isUnauthorized,
  shouldRetry,
} from '@/lib/api/errors'
import { toast } from '@/ui/toastStore'

/*
 * 서버 데이터 공통 설정 — 담당: 민지 (에러 규칙: src/lib/api/errors.ts)
 * - 불러오기 실패: 빨간 토스트 + 다시 시도 (404 는 화면이 목록으로 돌려보내는 등 따로 처리)
 * - 401: 로그아웃 → /login (불러오기 · 저장 모두)
 */
const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (isUnauthorized(error)) return void handleUnauthorized()
      if (isNotFound(error)) return
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
