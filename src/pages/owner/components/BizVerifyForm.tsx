import { Check } from 'lucide-react'
import { useState } from 'react'
import { toastApiError } from '@/lib/api/errors'
import { useAuthStore } from '@/lib/authStore'
import { ApiError } from '@/lib/apiClient'
import { useVerifyBizNo } from '@/pages/owner/api/stores'
import { Button } from '@/ui/Button'
import { Input } from '@/ui/Input'
import { toast } from '@/ui/toastStore'

// 사업자 확인 (매장 등록 ① 단계 · 마이페이지 매장 추가): 번호 · 대표자 이름 · 개업일 → 국세청 진위확인
// VERIFIED 면 onVerified(확인 번호), 칸을 고치면 다시 확인해야 해서 onVerified(null)

// BE 오류는 영어 문장이라 상태별로 화면 문구를 고른다
const VERIFY_ERROR: Record<number, string> = {
  422: '입력한 내용을 다시 확인해 주세요',
  502: '국세청 확인이 잠시 안 돼요. 잠시 뒤 다시 시도해 주세요',
  503: '지금은 사업자 확인을 할 수 없어요. 잠시 뒤 다시 시도해 주세요',
}

const formatBizNo = (value: string) => {
  const d = value.replace(/\D/g, '').slice(0, 10)
  if (d.length > 5) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
  if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`
  return d
}

const today = () => new Date().toLocaleDateString('sv-SE')

export function BizVerifyForm({
  verified,
  onVerified,
}: {
  /** 확인이 끝났는지 (확인 번호가 있는지) */
  verified: boolean
  onVerified: (verificationId: number | null) => void
}) {
  const nickname = useAuthStore((state) => state.me?.nickname)
  const [bizNo, setBizNo] = useState('')
  const [ownerName, setOwnerName] = useState(nickname ?? '')
  const [startDate, setStartDate] = useState('')
  const [error, setError] = useState('')
  const verify = useVerifyBizNo()

  const filled = bizNo.replace(/\D/g, '').length === 10 && !!ownerName.trim() && !!startDate

  // 칸을 고치면 확인을 다시 받는다
  const change = (set: (value: string) => void) => (value: string) => {
    set(value)
    setError('')
    if (verified) onVerified(null)
  }

  const check = () =>
    verify.mutate(
      { bizNo, ownerName, startDate },
      {
        onSuccess: (result) => {
          if (result.status === 'VERIFIED') return onVerified(result.verificationId)
          setError('국세청 정보와 맞지 않아요. 번호 · 대표자 이름 · 개업일을 다시 확인해 주세요')
        },
        onError: (err) => {
          const known = err instanceof ApiError ? VERIFY_ERROR[err.status] : undefined
          if (known) toast.error(known)
          else toastApiError(err, '확인하지 못했어요. 다시 시도해 주세요', check)
        },
      },
    )

  return (
    <div className="flex flex-col gap-2.5">
      <Input
        variant="card"
        inputMode="numeric"
        value={bizNo}
        onChange={(event) => change(setBizNo)(formatBizNo(event.target.value))}
        placeholder="사업자등록번호 000-00-00000"
        aria-label="사업자등록번호"
      />
      <Input
        variant="card"
        value={ownerName}
        onChange={(event) => change(setOwnerName)(event.target.value)}
        placeholder="대표자 이름 (사업자등록증과 같게)"
        aria-label="대표자 이름"
      />
      <label className="flex h-[52px] items-center justify-between gap-3 rounded-full bg-card px-[18px] text-[15px]">
        <span className="shrink-0 text-subtle">개업일</span>
        <input
          type="date"
          value={startDate}
          max={today()}
          onChange={(event) => change(setStartDate)(event.target.value)}
          aria-label="개업일"
          className="min-w-0 flex-1 border-none bg-transparent p-0 text-right text-[15px]"
        />
      </label>
      <span className="px-2 text-xs text-muted-foreground">
        사업자등록증에 있는 대로 넣으면 국세청에서 확인해요
      </span>
      {error && (
        <span role="alert" className="px-2 text-[13px] text-destructive-foreground">
          {error}
        </span>
      )}
      {verified ? (
        <div className="flex h-[52px] items-center justify-center gap-1.5 rounded-full bg-accent text-sm font-bold text-brand">
          <Check className="size-[18px]" />
          확인됐어요
        </div>
      ) : (
        <Button variant="ink" disabled={!filled || verify.isPending} onClick={check}>
          {verify.isPending ? '확인 중…' : '확인'}
        </Button>
      )}
    </div>
  )
}
