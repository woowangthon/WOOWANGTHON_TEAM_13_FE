import type { ReactNode } from 'react'

// 공용 보기 부품: 매장 색 동그라미 + 매장 아이콘 · 사장/알바 화면이 함께 사용 — 담당: 민지
export function StoreAvatar({
  color,
  children,
  size = 42,
}: {
  color: string
  children: ReactNode
  size?: number
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-background"
      style={{ background: color, width: size, height: size }}
    >
      {children}
    </span>
  )
}
