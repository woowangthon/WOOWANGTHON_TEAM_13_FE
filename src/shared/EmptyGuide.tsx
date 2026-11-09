import type { ReactNode } from 'react'
import { EmptyState } from '@/ui/EmptyState'

// 공용 보기 부품: 데이터가 아직 없을 때 · 사장/알바 화면이 함께 사용 — 담당: 민지
// "아직 ○○이 없어요" + 안내 한 줄 + 다음 행동 버튼 (ui/EmptyState 위에 얹는다)
export function EmptyGuide({
  message,
  hint,
  action,
  className,
}: {
  message: string
  /** 다음에 무슨 일이 생기는지 (예: 사장님이 등록하면 여기에 보여요) */
  hint?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <EmptyState
      className={className}
      message={message}
      action={
        hint || action ? (
          <>
            {hint && (
              <span className="text-[13px] leading-normal text-balance break-keep text-subtle">
                {hint}
              </span>
            )}
            {action}
          </>
        ) : undefined
      }
    />
  )
}
