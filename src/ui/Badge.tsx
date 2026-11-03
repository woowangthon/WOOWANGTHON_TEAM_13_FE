import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/ui/utils'

// 작은 알약 표시 (NEW · 오늘 · 연결됨 · 인수인계 태그) — 담당: 나현
const badgeVariants = cva(
  'inline-flex shrink-0 items-center rounded-full font-extrabold whitespace-nowrap',
  {
    variants: {
      variant: {
        new: 'bg-new text-white',
        brand: 'bg-brand text-white',
        white: 'bg-white text-brand',
        soft: 'bg-accent text-brand',
        warm: 'bg-warm text-warm-foreground',
        muted: 'bg-[#F1EFE9] text-[#5F6862]',
      },
      size: {
        xs: 'px-[7px] py-[3px] text-[10px]',
        sm: 'px-[9px] py-1 text-[11px] font-bold',
        md: 'px-[11px] py-[5px] text-xs font-bold',
      },
    },
    defaultVariants: { variant: 'new', size: 'xs' },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}
