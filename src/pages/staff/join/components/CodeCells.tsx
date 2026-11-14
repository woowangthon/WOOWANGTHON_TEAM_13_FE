import { CODE_LENGTH, normalizeCode } from '@/pages/staff/join/inviteCode'
import { cn } from '@/ui/utils'

// 초대코드 6칸: 보이는 칸 6개 위에 투명한 입력창 하나를 덮는다 (붙여넣기 · 자동 완성 그대로 동작)
// 칸 모양 (docs/08 챕터 7): 앱 글꼴 + 고정폭 숫자, 빈 칸 옅은 테두리(흰 바탕 위 구분) · 채운 칸 진한 선 · 입력 중 칸 매장 색 2px · 틀림 빨간 선

interface CodeCellsProps {
  value: string
  onChange: (value: string) => void
  error?: boolean
  disabled?: boolean
}

export function CodeCells({ value, onChange, error, disabled }: CodeCellsProps) {
  return (
    <label className="relative grid cursor-text grid-cols-6 gap-1.5">
      {Array.from({ length: CODE_LENGTH }, (_, i) => (
        <span
          key={i}
          className={cn(
            'flex aspect-[0.82] items-center justify-center rounded-2xl border bg-card text-[26px] font-bold tabular-nums transition-colors duration-150 motion-reduce:transition-none',
            error
              ? 'border-destructive/55'
              : i === value.length
                ? 'border-brand ring-1 ring-brand ring-inset'
                : value[i]
                  ? 'border-line'
                  : 'border-line/60',
          )}
        >
          {value[i] ?? ''}
        </span>
      ))}
      <input
        value={value}
        onChange={(event) => onChange(normalizeCode(event.target.value))}
        // 정리(normalizeCode: 대문자 · 영어 숫자만 · 6자) 전에 브라우저가 먼저 자르지 않게 넉넉히.
        // 그래야 "n4e-w7k" · "N4E W7K"처럼 - · 빈칸이 섞인 붙여넣기도 6글자가 다 들어간다
        maxLength={CODE_LENGTH * 4}
        autoComplete="one-time-code"
        autoCapitalize="characters"
        autoFocus
        disabled={disabled}
        aria-label="초대코드"
        aria-invalid={error}
        className="absolute inset-0 text-base uppercase opacity-0"
      />
    </label>
  )
}
