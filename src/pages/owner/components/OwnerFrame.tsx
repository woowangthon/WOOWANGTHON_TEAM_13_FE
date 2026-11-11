import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/ui/utils'

// 사장님 화면 바탕: 가운데 460px 기둥 (모바일 디자인) + 매장 색(--brand)
export function OwnerFrame({
  colors,
  children,
  className,
}: {
  colors: { color: string; soft: string }
  children: ReactNode
  className?: string
}) {
  const brand = { '--brand': colors.color, '--brand-soft': colors.soft } as CSSProperties
  return (
    <div className="min-h-dvh bg-canvas" style={brand}>
      <div
        className={cn(
          'relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col gap-5 bg-background px-4 pt-3.5 pb-[calc(130px+env(safe-area-inset-bottom))]',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
