import { toastApiError } from '@/lib/api/errors'
import { canSetTaxType, useUpdateTaxType } from '@/pages/owner/api/members'
import type { Member } from '@/pages/owner/api/types'
import { TAX_LABEL, TAX_OPTIONS, type TaxType } from '@/pages/owner/payroll/tax'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 직원 상세의 급여 공제: 4대보험 · 3.3% · 공제 없음 — 누르면 바로 저장하고 급여에 공제 · 실수령으로 반영
// 입장 전 직원은 BE 에 직원이 없어서 입장한 뒤에 정한다. BE 에 바꾸는 API 가 생기기 전(진짜 모드)에는 고를 수 없다
export function TaxTypeField({ member }: { member: Member }) {
  const update = useUpdateTaxType(member.storeId)
  const joined = member.status === 'active'
  const ready = canSetTaxType()
  const value = member.taxType ?? 'none'
  const hint = !joined
    ? '입장한 뒤에 정할 수 있어요'
    : !ready
      ? '공제 설정은 준비 중이에요'
      : TAX_OPTIONS.find((o) => o.value === value)?.hint

  const pick = (taxType: TaxType) => {
    if (taxType === value || update.isPending) return
    update.mutate(
      { memberId: member.memberId, taxType },
      {
        onSuccess: () => toast(`급여 공제를 ${TAX_LABEL[taxType]}(으)로 바꿨어요`),
        onError: (error) =>
          toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', () => pick(taxType)),
      },
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-[22px] bg-white p-3.5">
      <span className="px-1 text-[13px] font-bold text-muted-foreground">급여 공제</span>
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="급여 공제">
        {TAX_OPTIONS.map((o) => {
          const on = joined && o.value === value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!joined || !ready || update.isPending}
              onClick={() => pick(o.value)}
              className={cn(
                'h-[42px] rounded-[14px] text-sm font-bold whitespace-nowrap transition-transform enabled:active:scale-[0.97] disabled:cursor-not-allowed',
                on ? 'bg-brand text-white' : 'bg-background text-foreground disabled:text-faint',
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      {hint && <span className="px-1 text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}
