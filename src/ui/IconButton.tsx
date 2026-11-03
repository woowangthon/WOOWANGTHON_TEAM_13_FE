import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/ui/utils'

// 동그란 아이콘 버튼 (뒤로 · 원형 화살표 · 보내기) — 담당: 나현. aria-label 필수
const iconButtonVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        card: 'bg-card text-foreground',
        white: 'bg-white text-foreground',
        brand: 'bg-brand text-white disabled:bg-[#B9BFBB]',
        ink: 'bg-ink text-white',
      },
      size: {
        sm: 'size-8 [&_svg]:size-5',
        md: 'size-[42px] [&_svg]:size-[22px]',
        lg: 'size-[46px] [&_svg]:size-6',
      },
    },
    defaultVariants: { variant: 'card', size: 'md' },
  },
)

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof iconButtonVariants> {
  'aria-label': string
}

export function IconButton({
  className,
  variant,
  size,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
