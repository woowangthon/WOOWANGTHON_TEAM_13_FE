import type { HandoverItem as HandoverItemData } from '@/lib/api/types'
import { HandoverItem } from '@/shared/handover/HandoverItem'
import { HANDOVER_TAG_LABEL } from '@/shared/icons'

// 공용 보기 부품: 인수인계 목록 · 사장/알바 화면이 함께 사용 — 담당: 민지
// live(오늘): 체크할 수 있고 처리한 항목은 흐리게. 지난 날짜: 모두 처리됨으로 보여 주고 체크 불가
// variant: 'card'(기본, 지금 모양) = 항목마다 따로 떨어진 카드 · 'list' = 카드 한 장 안의 할 일 목록 (알바 홈)
interface HandoverListProps {
  items: HandoverItemData[]
  live: boolean
  onToggle: (item: HandoverItemData) => void
  /** 작성자 · 시간 (예: 하늘 · 05:09). card: 항목 오른쪽 (안 주면 태그 색 점) · list: 아래 줄 "재고 · 하늘 · 05:09" */
  meta?: (item: HandoverItemData) => string | undefined
  /** 모양 (기본 card) */
  variant?: 'card' | 'list'
}

export function HandoverList({ items, live, onToggle, meta, variant = 'card' }: HandoverListProps) {
  const renderItem = (item: HandoverItemData) => {
    const done = live ? item.checked : true
    const tag = HANDOVER_TAG_LABEL[item.tag]
    return (
      <HandoverItem
        key={item.itemId}
        item={item}
        done={done}
        faded={live && done}
        subText={live ? tag : `${tag} · 처리됨`}
        disabled={!live}
        meta={meta?.(item)}
        variant={variant}
        onToggle={() => onToggle(item)}
      />
    )
  }

  // card: 지금처럼 항목 카드만 나란히 (감싸는 요소 없음 — 화면이 정한 간격 그대로)
  if (variant === 'card') return items.map(renderItem)

  return (
    <ul className="m-0 list-none overflow-hidden rounded-[20px] bg-card p-0 shadow-soft">
      {items.map((item, i) => (
        <li key={item.itemId}>
          {/* 구분선: 체크 동그라미 다음(왼쪽 16 + 24 + 14px)부터 */}
          {i > 0 && <div aria-hidden="true" className="mr-4 ml-[54px] h-px bg-line/60" />}
          {renderItem(item)}
        </li>
      ))}
    </ul>
  )
}
