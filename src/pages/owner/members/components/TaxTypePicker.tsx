import { TAX_OPTIONS, type TaxType } from '@/pages/owner/payroll/tax'
import { cn } from '@/ui/utils'

// 급여 공제 고르기 칸: 4대보험 · 3.3% · 공제 없음 + 고른 것 설명 (직원 상세 TaxTypeField · 알바생 초대 InviteForm 이 같이 쓴다)
export function TaxTypePicker({
  value,
  onChange,
  disabled,
  hint,
}: {
  value: TaxType
  onChange: (taxType: TaxType) => void
  disabled?: boolean
  /** 아래 설명 (안 주면 고른 공제 설명) */
  hint?: string
}) {
  const shownHint = hint ?? TAX_OPTIONS.find((o) => o.value === value)?.hint
  return (
    <div className="flex flex-col gap-2 rounded-[22px] bg-white p-3.5">
      <span className="px-1 text-[13px] font-bold text-muted-foreground">급여 공제</span>
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="급여 공제">
        {TAX_OPTIONS.map((o) => {
          const on = o.value === value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={cn(
                'h-[42px] rounded-[14px] text-[15px] font-bold whitespace-nowrap transition-transform enabled:active:scale-[0.97] disabled:cursor-not-allowed',
                on ? 'bg-brand text-white' : 'bg-background text-foreground disabled:text-faint',
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      {shownHint && <span className="px-1 text-xs text-muted-foreground">{shownHint}</span>}
    </div>
  )
}
