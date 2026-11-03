import { LoaderCircle } from 'lucide-react'
import { cn } from '@/ui/utils'

// 불러오는 중 — 담당: 나현
export function Spinner({
  className,
  label = '불러오는 중',
}: {
  className?: string
  label?: string
}) {
  return (
    <div role="status" aria-label={label} className={cn('flex justify-center py-10', className)}>
      <LoaderCircle className="size-7 animate-spin text-brand" />
    </div>
  )
}
