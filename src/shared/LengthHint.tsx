import { cn } from '@/ui/utils'

// 공용 보기 부품: 글자 수 안내 · 사장/알바 화면이 함께 사용 — 담당: 민지
// 입력칸에 maxLength 를 걸고, 한도의 90%부터 "950 / 1000자"를 보여 준다. 다 차면 빨간 글씨로 안내
export function LengthHint({
  length,
  max,
  className,
}: {
  length: number
  max: number
  className?: string
}) {
  if (length < max * 0.9) return null
  const full = length >= max
  return (
    <span
      aria-live="polite"
      className={cn(
        'text-right text-xs font-semibold',
        full ? 'text-destructive' : 'text-subtle',
        className,
      )}
    >
      {full
        ? `${max.toLocaleString('ko-KR')}자까지 쓸 수 있어요`
        : `${length.toLocaleString('ko-KR')} / ${max.toLocaleString('ko-KR')}자`}
    </span>
  )
}
