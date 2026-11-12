import type { CSSProperties, ReactNode } from 'react'
import { OwnerSidebar } from '@/pages/owner/components/OwnerSidebar'
import { cn } from '@/ui/utils'

// 사장님 화면 바탕: 알바(StaffFrame)와 같게 가운데 460px 기둥은 흰색 · 바깥은 canvas (모바일 디자인) + 매장 색(--brand)
// 데스크톱(lg 1024px 이상): 왼쪽 메뉴(OwnerSidebar) + 넓은 본문 (가운데 최대 1180px). 하단 탭은 OwnerLayout 이 숨긴다
// .owner-wide: 이 안의 시트(ui/BottomSheet)는 데스크톱에서 가운데 대화창으로 뜬다
export function OwnerFrame({
  colors,
  children,
  className,
  narrow,
}: {
  colors: { color: string; soft: string }
  children: ReactNode
  className?: string
  /** 데스크톱에서 가운데 좁은 칸(760px) — 마이페이지 · 알림처럼 한 줄 목록인 화면 */
  narrow?: boolean
}) {
  const brand = { '--brand': colors.color, '--brand-soft': colors.soft } as CSSProperties
  return (
    <div className="owner-wide min-h-dvh bg-canvas lg:bg-white" style={brand}>
      <OwnerSidebar />
      <div
        className={cn(
          'relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col gap-5 bg-white px-4 pt-3.5 pb-[calc(130px+env(safe-area-inset-bottom))]',
          // 데스크톱: 메뉴 옆 넓은 칸, 본문은 가운데 1180px 까지
          'lg:ml-[256px] lg:w-auto lg:max-w-none lg:gap-6 lg:px-[max(40px,calc((100vw-256px-1180px)/2))] lg:pt-7 lg:pb-14',
          narrow && 'lg:px-[max(40px,calc((100vw-256px-760px)/2))]',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
