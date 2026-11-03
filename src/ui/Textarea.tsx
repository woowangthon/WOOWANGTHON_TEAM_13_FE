import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/ui/utils'

// 여러 줄 입력 — 담당: 나현
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-[150px] resize-none rounded-[20px] border-none bg-white p-4 text-[15px] leading-relaxed text-foreground placeholder:text-subtle',
        className,
      )}
      {...props}
    />
  )
}
