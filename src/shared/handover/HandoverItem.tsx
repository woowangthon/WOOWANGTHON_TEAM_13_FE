import { Check } from 'lucide-react'
import type { HandoverItem as HandoverItemData } from '@/api/mocks/staff/handovers'
import { HANDOVER_TAG_COLOR } from '@/shared/icons'
import { cn } from '@/ui/utils'

// 공용 보기 부품: 인수인계 항목 1개 · 체크 · 사장/알바 화면이 함께 사용 — 담당: 민지
interface HandoverItemProps {
  item: HandoverItemData
  /** 체크 표시 */
  done: boolean
  /** 흐리게 + 가운데 줄 (오늘 처리한 항목) */
  faded: boolean
  /** 아래 작은 글씨 (예: 재고 · 처리됨) */
  subText: string
  /** 지난 날짜처럼 체크할 수 없을 때 */
  disabled?: boolean
  onToggle: () => void
}

export function HandoverItem({
  item,
  done,
  faded,
  subText,
  disabled,
  onToggle,
}: HandoverItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-pressed={done}
      className={cn(
        'flex items-center gap-3.5 rounded-[20px] bg-card p-4 text-left shadow-soft disabled:cursor-default',
        faded && 'opacity-50',
      )}
    >
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-[7px] border-[1.5px] text-white',
          done ? 'border-brand bg-brand' : 'border-line bg-transparent',
        )}
      >
        {done && <Check className="size-4" strokeWidth={3} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span
          className={cn(
            'text-[15px] leading-[1.4] font-semibold break-keep',
            faded && 'line-through',
          )}
        >
          {item.text}
        </span>
        <span className="text-xs text-subtle">{subText}</span>
      </span>
      <span
        className="size-[7px] shrink-0 rounded-full"
        style={{ background: faded ? '#CFC8BA' : HANDOVER_TAG_COLOR[item.tag] }}
      />
    </button>
  )
}
