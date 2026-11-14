import { toastApiError } from '@/lib/api/errors'
import { useUpdateTaxType } from '@/pages/owner/api/members'
import type { Member } from '@/pages/owner/api/types'
import { TaxTypePicker } from '@/pages/owner/members/components/TaxTypePicker'
import { TAX_LABEL, TAX_OPTIONS, type TaxType } from '@/pages/owner/payroll/tax'
import { toast } from '@/ui/toastStore'

// 직원 상세의 급여 공제: 4대보험 · 3.3% · 공제 없음 — 누르면 바로 저장하고 급여에 공제 · 실수령으로 반영
// 입장 전 직원은 초대에 저장해 두고 입장하면 그대로 적용된다 (BE #52 PATCH …/invitations/{id} taxType)
export function TaxTypeField({ member }: { member: Member }) {
  const update = useUpdateTaxType(member.storeId)
  const value = member.taxType ?? 'none'
  const invited = member.status === 'invited'

  const pick = (taxType: TaxType) => {
    if (taxType === value || update.isPending) return
    update.mutate(
      { member, taxType },
      {
        onSuccess: () => toast(`급여 공제를 ${TAX_LABEL[taxType]}(으)로 바꿨어요`),
        onError: (error) =>
          toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', () => pick(taxType)),
      },
    )
  }

  return (
    <TaxTypePicker
      value={value}
      onChange={pick}
      disabled={update.isPending}
      hint={
        invited
          ? `입장하면 이대로 적용돼요 · ${TAX_OPTIONS.find((o) => o.value === value)?.hint ?? ''}`
          : undefined
      }
    />
  )
}
