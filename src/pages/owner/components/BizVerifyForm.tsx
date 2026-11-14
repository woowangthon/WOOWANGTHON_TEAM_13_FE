import { Check } from 'lucide-react'
import { useState } from 'react'
import { toastApiError } from '@/lib/api/errors'
import { ApiError } from '@/lib/apiClient'
import { useVerifyBizNo } from '@/pages/owner/api/stores'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 사업자등록번호 칸 (매장 등록 ① 매장 정보 안 — 온보딩 · 마이페이지 [매장 추가] 둘 다): 번호만 → 국세청 상태조회 (BE #40)
// 지금 영업 중(계속사업자)이면 VERIFIED → onVerified(확인 번호), 번호를 고치면 다시 확인해야 해서 onVerified(null)
// 시연 · 테스트는 000-00-00000 (BE 가 국세청 없이 VERIFIED)

// BE 오류는 영어 문장이라 상태별로 화면 문구를 고른다
const VERIFY_ERROR: Record<number, string> = {
  422: '사업자등록번호 10자리를 다시 확인해 주세요',
  502: '국세청 확인이 잠시 안 돼요. 잠시 뒤 다시 시도해 주세요',
  503: '지금은 사업자 확인을 할 수 없어요. 잠시 뒤 다시 시도해 주세요',
}

const formatBizNo = (value: string) => {
  const d = value.replace(/\D/g, '').slice(0, 10)
  if (d.length > 5) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
  if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`
  return d
}

export function BizVerifyForm({
  verified,
  onVerified,
}: {
  /** 확인이 끝났는지 (확인 번호가 있는지) */
  verified: boolean
  onVerified: (verificationId: number | null) => void
}) {
  const [bizNo, setBizNo] = useState('')
  const [error, setError] = useState('')
  const verify = useVerifyBizNo()

  const filled = bizNo.replace(/\D/g, '').length === 10

  // 번호를 고치면 확인을 다시 받는다
  const change = (value: string) => {
    setBizNo(formatBizNo(value))
    setError('')
    if (verified) onVerified(null)
  }

  const check = () =>
    verify.mutate(
      { bizNo },
      {
        onSuccess: (result) => {
          if (result.status === 'VERIFIED') return onVerified(result.verificationId)
          setError('영업 중인 사업자로 확인되지 않아요. 번호를 다시 확인해 주세요')
        },
        onError: (err) => {
          const known = err instanceof ApiError ? VERIFY_ERROR[err.status] : undefined
          if (known) toast.error(known)
          else toastApiError(err, '확인하지 못했어요. 다시 시도해 주세요', check)
        },
      },
    )

  return (
    <div className="flex flex-col gap-1.5 rounded-[20px] bg-card px-[18px] py-3.5 border border-line/60 lg:px-[22px] lg:py-4">
      <span className="text-xs font-bold text-muted-foreground">사업자등록번호</span>
      <div className="flex items-center gap-2">
        <input
          inputMode="numeric"
          value={bizNo}
          onChange={(event) => change(event.target.value)}
          placeholder="000-00-00000"
          aria-label="사업자등록번호"
          className="min-w-0 flex-1 border-none bg-transparent p-0 text-[16px] font-bold placeholder:text-faint lg:text-[19px]"
        />
        {verified ? (
          <span className="flex shrink-0 items-center gap-1 text-[15px] font-bold text-brand">
            <Check className="size-[18px]" />
            확인
          </span>
        ) : (
          <button
            type="button"
            disabled={!filled || verify.isPending}
            onClick={check}
            className={cn(
              'h-9 shrink-0 rounded-full px-4 text-[15px] font-bold transition-transform enabled:active:scale-[0.97]',
              filled ? 'bg-ink text-white' : 'bg-background text-faint',
            )}
          >
            {verify.isPending ? '확인 중…' : '확인'}
          </button>
        )}
      </div>
      {error ? (
        <span role="alert" className="text-[13px] text-destructive-foreground">
          {error}
        </span>
      ) : verified ? (
        // 데스크톱: 확인이 끝났다는 걸 글자로도 (휴대폰은 오른쪽 ✓ 확인만)
        <span className="hidden items-center gap-1 text-[13px] font-bold text-brand lg:flex">
          <Check className="size-4" aria-hidden="true" />
          영업 중인 사업자예요
        </span>
      ) : (
        // 데스크톱은 두 칸 아래 한 줄로 따로 보여 줘서(StoreCreatePage) 카드 안에선 숨긴다
        <span className="text-xs text-muted-foreground lg:hidden">
          국세청에서 영업 중인 사업자인지 확인해요
        </span>
      )}
    </div>
  )
}
