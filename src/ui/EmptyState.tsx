import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/ui/utils'

// 데이터 없음 — 담당: 나현. icon 이 있으면 가로형, 없으면 가운데 정렬형
interface EmptyStateProps {
  message: string
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}

export function EmptyState({ message, icon: Icon, action, className }: EmptyStateProps) {
  if (Icon) {
    return (
      <div
        className={cn(
          'flex items-center gap-3.5 rounded-[24px] bg-card px-[22px] py-5 shadow-soft',
          className,
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Icon className="size-5" />
        </span>
        <span className="text-[15px] leading-normal font-semibold">{message}</span>
        {action}
      </div>
    )
  }
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-[24px] bg-card p-6 text-center',
        className,
      )}
    >
      <span className="text-sm text-muted-foreground">{message}</span>
      {action}
    </div>
  )
}
