import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/ui/utils'

// 버튼 — 담당: 나현. 모든 버튼은 알약 모양(rounded-full)이다.
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-bold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-100 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        brand: 'bg-brand text-white disabled:bg-[#B9BFBB]',
        ink: 'bg-ink text-white disabled:bg-[#B9BFBB]',
        soft: 'bg-secondary text-foreground',
        white: 'bg-white text-foreground',
        danger: 'bg-destructive text-white',
        ghost: 'bg-transparent text-[#4F554D] font-semibold',
        /** 카카오 로그인 · 카톡 보내기 (카카오 브랜드 노랑) */
        kakao: 'bg-[#FEE500] text-black/85 disabled:opacity-60',
      },
      size: {
        sm: 'h-9 px-3.5 text-[13px]',
        md: 'h-11 px-[18px] text-sm [&_svg]:size-[18px]',
        lg: 'h-[52px] px-5 text-[15px] [&_svg]:size-[18px]',
        xl: 'h-[58px] px-6 text-[17px] font-extrabold',
      },
    },
    defaultVariants: { variant: 'brand', size: 'lg' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
}
