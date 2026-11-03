import { CODE_LENGTH, normalizeCode } from '@/pages/staff/join/inviteCode'
import { cn } from '@/ui/utils'

// 초대코드 6칸: 보이는 칸 6개 위에 투명한 입력창 하나를 덮는다 (붙여넣기 · 자동 완성 그대로 동작)

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
            'flex aspect-[0.82] items-center justify-center rounded-[16px] border-2 bg-card font-mono text-2xl font-bold shadow-soft',
            error
              ? 'border-destructive/55'
              : i === value.length
                ? 'border-brand'
                : value[i]
                  ? 'border-line'
                  : 'border-transparent',
          )}
        >
          {value[i] ?? ''}
        </span>
      ))}
      <input
        value={value}
        onChange={(event) => onChange(normalizeCode(event.target.value))}
        maxLength={CODE_LENGTH}
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
