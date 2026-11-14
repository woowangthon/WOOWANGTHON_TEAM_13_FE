import { Copy } from 'lucide-react'
import type { Manual } from '@/lib/api/types'
import { findPassword, manualLines } from '@/shared/manual/manualText'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toastStore'

// 매뉴얼 상세 시트 (비밀번호가 있으면 복사 버튼)
// 제목 26px → 본문 15px · 줄 간격 1.55 (docs/08 본문). "1) … 2) …" 처럼 번호로 쓴 글은 단계 목록으로 나눠 보여 준다
export function ManualSheet({
  manual,
  storeName,
  onClose,
}: {
  manual: Manual
  storeName: string
  onClose: () => void
}) {
  const password = findPassword(manual.body)
  const { lines, numbered } = manualLines(manual.body)

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
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1 pr-10">
          <span className="text-[13px] font-medium text-muted-foreground">{storeName} 매뉴얼</span>
          <h2 className="m-0 text-[26px] leading-[1.25] font-extrabold tracking-[-0.03em] break-keep">
            {manual.title}
          </h2>
        </div>
        {numbered && lines.length > 1 ? (
          <ol className="m-0 flex list-none flex-col rounded-2xl bg-white px-4 py-1">
            {lines.map((line, i) => (
              <li
                key={`${i}-${line}`}
                className="flex items-start gap-3 border-b border-line/60 py-3.5 last:border-b-0"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand tabular-nums">
                  {i + 1}
                </span>
                <span className="text-[15px] leading-[1.55] break-keep tabular-nums">{line}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="m-0 rounded-2xl bg-white p-4 text-[15px] leading-[1.55] break-keep whitespace-pre-line tabular-nums">
            {manual.body}
          </p>
        )}
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
