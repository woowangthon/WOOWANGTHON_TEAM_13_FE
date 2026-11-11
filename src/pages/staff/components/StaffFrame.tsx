import type { CSSProperties, ReactNode } from 'react'
import { ScrollRestoration } from 'react-router'
import { cn } from '@/ui/utils'

// 알바생 화면 바탕: 가운데 460px 기둥 + 매장 색(--brand) 적용
// 스크롤 위치: 새 화면(탭 이동 등)은 맨 위, 뒤로 가기는 원래 자리 (ScrollRestoration).
// 목록 위에 뜨는 시트 주소(레시피 · 매뉴얼 상세, 인수인계, 가능 시간)는 링크에 preventScrollReset 을 붙여 목록 자리를 그대로 둔다
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
    <div className="min-h-dvh bg-canvas pt-(--offline-banner,0px)" style={brand}>
      <div
        className={cn(
          'relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col gap-[18px] bg-background px-4 pt-3.5 pb-[calc(130px+env(safe-area-inset-bottom))]',
          className,
        )}
      >
        {children}
      </div>
      <ScrollRestoration />
    </div>
  )
}
