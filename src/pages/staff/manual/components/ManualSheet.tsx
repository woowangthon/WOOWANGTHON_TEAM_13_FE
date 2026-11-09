import { Copy } from 'lucide-react'
import type { Manual } from '@/lib/api/types'
import { DEFAULT_MANUAL_ICON, MANUAL_ICON } from '@/shared/icons'
import { findPassword } from '@/shared/manual/manualText'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toastStore'

// 매뉴얼 상세 시트 (비밀번호가 있으면 복사 버튼)
export function ManualSheet({
  manual,
  storeName,
  onClose,
}: {
  manual: Manual
  storeName: string
  onClose: () => void
}) {
  const Icon = (manual.icon && MANUAL_ICON[manual.icon]) || DEFAULT_MANUAL_ICON
  const password = findPassword(manual.body)

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password!)
      toast('비밀번호를 복사했어요')
    } catch {
      toast.error('복사하지 못했어요. 길게 눌러 복사해 주세요')
    }
  }

  return (
    <BottomSheet open onClose={onClose} label={manual.title} closeButton>
      <div className="flex flex-col gap-3">
        <span className="flex size-[52px] items-center justify-center rounded-full bg-brand-soft text-brand">
          <Icon className="size-[26px]" />
        </span>
        <span className="text-[13px] text-muted-foreground">{storeName} 매뉴얼</span>
        <h2 className="m-0 -mt-1.5 text-[26px] font-bold">{manual.title}</h2>
        <div className="rounded-[22px] bg-white p-[18px] text-base leading-[1.75]">
          {manual.body}
        </div>
        {password && (
          <Button variant="soft" size="md" className="self-start" onClick={copyPassword}>
            <Copy />
            비밀번호 복사
          </Button>
        )}
      </div>
    </BottomSheet>
  )
}
