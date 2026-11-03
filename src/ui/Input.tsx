import { cva, type VariantProps } from 'class-variance-authority'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/ui/utils'

// 입력창 — 담당: 나현. white: 시트 안 / card: 배경 위 알약
const inputVariants = cva(
  'h-[52px] min-w-0 border-none px-4 text-[15px] text-foreground placeholder:text-subtle',
  {
    variants: {
      variant: {
        white: 'rounded-[18px] bg-white',
        card: 'rounded-full bg-card px-[18px]',
      },
    },
    defaultVariants: { variant: 'white' },
  },
)

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>, VariantProps<typeof inputVariants> {}

export function Input({ className, variant, ...props }: InputProps) {
  return <input className={cn(inputVariants({ variant }), className)} {...props} />
}
