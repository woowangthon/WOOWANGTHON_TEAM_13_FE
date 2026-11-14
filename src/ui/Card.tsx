import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cn } from '@/ui/utils'

// 카드 — 담당: 나현. dark 는 매장 색 + 옅은 원형 라인 텍스처 (AI 요약 · 급여 · 오늘 근무)
const cardVariants = cva('flex flex-col', {
  variants: {
    variant: {
      default: 'rounded-[24px] bg-card shadow-soft',
      flat: 'rounded-[24px] bg-card',
      white: 'rounded-[22px] bg-white',
      dark: 'rounded-[28px] bg-brand texture text-white',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export function Card({ className, variant, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant }), className)} {...props} />
}
