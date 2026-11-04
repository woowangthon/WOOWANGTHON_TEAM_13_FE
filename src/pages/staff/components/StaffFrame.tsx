import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/ui/utils'

// 알바생 화면 바탕: 가운데 460px 기둥 + 매장 색(--brand) 적용
export function StaffFrame({
  store,
  children,
  className,
}: {
  /** 매장 색 (useCurrentStore 의 store) */
  store: { color: string; soft: string }
  children: ReactNode
  className?: string
}) {
  const brand = { '--brand': store.color, '--brand-soft': store.soft } as CSSProperties
  return (
    <div className="min-h-dvh bg-canvas" style={brand}>
      <div
        className={cn(
          'relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col gap-[18px] bg-background px-4 pt-3.5 pb-[130px]',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
