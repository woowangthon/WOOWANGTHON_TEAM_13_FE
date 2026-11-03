import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/ui/utils'

// 칩 (자주 묻는 질문 · 매장 필터) — 담당: 나현
interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

export function Chip({ active, className, type = 'button', ...props }: ChipProps) {
  return (
    <button
      type={type}
      className={cn(
        'shrink-0 rounded-full px-3.5 py-[9px] text-[13px] font-semibold whitespace-nowrap transition-colors',
        active ? 'bg-brand text-white' : 'bg-card text-[#3E4642]',
        className,
      )}
      {...props}
    />
  )
}
