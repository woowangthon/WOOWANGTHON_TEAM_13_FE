import type { HandoverItem as HandoverItemData } from '@/lib/api/types'
import { HandoverItem } from '@/shared/handover/HandoverItem'
import { HANDOVER_TAG_LABEL } from '@/shared/icons'

// 공용 보기 부품: 인수인계 목록 · 사장/알바 화면이 함께 사용 — 담당: 민지
// live(오늘): 체크할 수 있고 처리한 항목은 흐리게. 지난 날짜: 모두 처리됨으로 보여 주고 체크 불가
interface HandoverListProps {
  items: HandoverItemData[]
  live: boolean
  onToggle: (item: HandoverItemData) => void
  /** 항목 오른쪽 작은 글씨 (예: 작성자 · 시간). 안 주면 지금처럼 태그 색 점 */
  meta?: (item: HandoverItemData) => string | undefined
}

export function HandoverList({ items, live, onToggle, meta }: HandoverListProps) {
  return items.map((item) => {
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
        onToggle={() => onToggle(item)}
      />
    )
  })
}
