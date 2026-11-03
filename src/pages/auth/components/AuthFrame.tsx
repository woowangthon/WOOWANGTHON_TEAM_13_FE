import type { ReactNode } from 'react'
import { Toaster } from '@/ui/Toast'
import { cn } from '@/ui/utils'

// 로그인 · 역할 선택 화면 바탕: 알바 화면(StaffFrame)과 같은 가운데 460px 기둥 + 기본 매장 색
export function AuthFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <main
        className={cn(
          'relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col gap-5 bg-background px-4 pt-3.5 pb-7',
          className,
        )}
      >
        {children}
      </main>
      <Toaster bottom={32} />
    </div>
  )
}
