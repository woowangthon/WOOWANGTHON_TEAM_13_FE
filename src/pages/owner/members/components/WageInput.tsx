import { MIN_WAGE } from '@/api/mocks/owner/data'
import { cn } from '@/ui/utils'

// 시급 입력 (숫자만 · 천 단위 쉼표). 최저시급 미만이면 빨간 테두리 + 안내 (docs/03 S4: 저장 불가)
export function WageInput({
  value,
  onChange,
  className,
}: {
  /** 숫자만 들어간 문자열 */
  value: string
  onChange: (digits: string) => void
  className?: string
}) {
  const wage = Number(value) || 0
  const low = value !== '' && wage < MIN_WAGE
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        className={cn(
          'flex h-[54px] items-center gap-2 rounded-[18px] border-[1.5px] bg-white px-[18px]',
          low ? 'border-[#E7A39D]' : 'border-[#E1DED5]',
        )}
      >
        <span className="text-sm text-muted-foreground">시급</span>
        <input
          inputMode="numeric"
          value={value ? Number(value).toLocaleString('ko-KR') : ''}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
          aria-label="시급"
          aria-invalid={low}
          className="min-w-0 flex-1 border-none bg-transparent text-right text-base"
        />
        <span className="text-sm text-muted-foreground">원</span>
      </label>
      {low && (
        <span role="alert" className="px-1 text-[13px] text-destructive-foreground">
          최저시급 {MIN_WAGE.toLocaleString('ko-KR')}원보다 낮아요
        </span>
      )}
    </div>
  )
}
