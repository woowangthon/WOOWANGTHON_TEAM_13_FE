import { StickyNote } from 'lucide-react'
import type { Manual } from '@/api/mocks/staff/manuals'
import { MANUAL_ICON } from '@/pages/staff/components/icons'
import { BottomSheet } from '@/ui/BottomSheet'

// 매뉴얼 상세 시트
export function ManualSheet({
  manual,
  storeName,
  onClose,
}: {
  manual: Manual
  storeName: string
  onClose: () => void
}) {
  const Icon = MANUAL_ICON[manual.icon] ?? StickyNote
  return (
    <BottomSheet open onClose={onClose} label={manual.title}>
      <div className="flex flex-col gap-3">
        <span className="flex size-[52px] items-center justify-center rounded-full bg-brand-soft text-brand">
          <Icon className="size-[26px]" />
        </span>
        <span className="text-[13px] text-muted-foreground">{storeName} 매뉴얼</span>
        <h2 className="m-0 -mt-1.5 text-[26px] font-bold">{manual.title}</h2>
        <div className="rounded-[22px] bg-white p-[18px] text-base leading-[1.75]">
          {manual.body}
        </div>
      </div>
    </BottomSheet>
  )
}
