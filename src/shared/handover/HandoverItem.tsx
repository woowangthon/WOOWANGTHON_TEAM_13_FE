import { Check } from 'lucide-react'
import type { HandoverItem as HandoverItemData } from '@/lib/api/types'
import { HANDOVER_TAG_COLOR } from '@/shared/icons'
import { PRESSABLE_CARD_ENABLED } from '@/shared/pressable'
import { cn } from '@/ui/utils'

// 공용 보기 부품: 인수인계 항목 1개 · 체크 · 사장/알바 화면이 함께 사용 — 담당: 민지
// variant: 'card'(기본) = 항목마다 따로 떨어진 카드 · 'list' = 한 장 카드 안의 할 일 목록 줄 (HandoverList 가 카드로 감싼다)
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
  /** 작성자 · 시간 (예: 하늘 · 07:36). card: 오른쪽 작은 글씨(안 주면 태그 색 점) · list: 아래 줄에 이어서 */
  meta?: string
  /** 모양 (기본 card) */
  variant?: 'card' | 'list'
  onToggle: () => void
}

export function HandoverItem({
  item,
  done,
  faded,
  subText,
  disabled,
  meta,
  variant = 'card',
  onToggle,
}: HandoverItemProps) {
  const list = variant === 'list'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-pressed={done}
      className={cn(
        'flex items-center gap-3.5 text-left disabled:cursor-default',
        list
          ? // 목록 줄: 누를 때 그 줄만 살짝 어두워진다 (카드 전체는 그대로)
            'w-full px-4 py-3.5 transition-colors duration-150 enabled:active:bg-background motion-reduce:transition-none'
          : cn('rounded-[20px] bg-card p-4 shadow-soft', PRESSABLE_CARD_ENABLED),
        faded && 'opacity-50',
      )}
    >
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center border-[1.5px] text-white transition-colors duration-150',
          list ? 'rounded-full' : 'rounded-[7px]',
          done ? 'border-brand bg-brand' : 'border-line bg-transparent',
        )}
      >
        {done && (
          <Check
            className={cn(
              'animate-in duration-150 zoom-in-50 fade-in-0 motion-reduce:animate-none',
              list ? 'size-3.5' : 'size-4',
            )}
            strokeWidth={3}
          />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span
          className={cn(
            'text-[15px] leading-[1.4] break-keep',
            list ? 'font-bold' : 'font-semibold',
            faded && 'line-through',
          )}
        >
          {item.text}
        </span>
        <span className="text-xs text-subtle tabular-nums">
          {list && meta ? `${subText} · ${meta}` : subText}
        </span>
      </span>
      {list ? null : meta ? (
        // 한 줄로만 (긴 이름은 …), 항목 글자가 대신 줄바꿈된다
        <span className="max-w-[42%] shrink-0 truncate text-xs font-medium text-subtle tabular-nums">
          {meta}
        </span>
      ) : (
        <span
          className="size-[7px] shrink-0 rounded-full"
          style={{ background: faded ? '#CFC8BA' : HANDOVER_TAG_COLOR[item.tag] }}
        />
      )}
    </button>
  )
}
