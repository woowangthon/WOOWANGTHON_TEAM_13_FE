import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/ui/utils'

// 칩 (자주 묻는 질문 · 매장 필터) — 담당: 나현. 누르면 살짝 작아지고 어두워진다
interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

export function Chip({ active, className, type = 'button', ...props }: ChipProps) {
  return (
    <button
      type={type}
      className={cn(
        'shrink-0 rounded-full px-3.5 py-[9px] text-[13px] font-semibold whitespace-nowrap transition-[color,background-color,transform,filter] duration-100 enabled:active:scale-[0.97] enabled:active:brightness-95 motion-reduce:enabled:active:scale-100',
        active ? 'bg-brand text-white' : 'bg-card text-[#3E4642]',
        className,
      )}
      {...props}
    />
  )
}
