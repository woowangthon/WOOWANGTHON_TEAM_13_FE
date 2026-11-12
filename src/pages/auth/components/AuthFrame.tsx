import type { ReactNode } from 'react'
import { useThemeColor, WHITE_THEME_COLOR } from '@/lib/useThemeColor'
import { Toaster } from '@/ui/Toast'
import { cn } from '@/ui/utils'

// 로그인 · 역할 선택 화면 바탕: 알바 화면(StaffFrame)과 같은 가운데 460px 기둥 + 기본 매장 색
// tone: 기본 cream = 지금(--background, 사장님 매장 등록이 씀) · white = 흰색 + 보이는 동안 상태 바도 흰색
//       (로그인 · 역할 · 로그인 확인 · 초대코드 입장 — docs/08 4)
export function AuthFrame({
  children,
  className,
  tone = 'cream',
}: {
  children: ReactNode
  className?: string
  tone?: 'cream' | 'white'
}) {
  useThemeColor(tone === 'white' ? WHITE_THEME_COLOR : null)
  return (
    <div className="min-h-dvh bg-canvas">
      <main
        className={cn(
          'relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col gap-5 px-4 pt-3.5 pb-7',
          tone === 'white' ? 'bg-white' : 'bg-background',
          className,
        )}
      >
        {children}
      </main>
      <Toaster bottom={32} />
    </div>
  )
}
