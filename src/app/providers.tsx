import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AuthBootstrap } from '@/app/AuthBootstrap'
import { queryClient } from '@/app/queryClient'

// 서버 데이터 공통 설정(에러 토스트 · 재시도 · 401)은 app/queryClient.ts
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>{children}</AuthBootstrap>
    </QueryClientProvider>
  )
}
