import type { HandoverItem as HandoverItemData } from '@/api/mocks/staff/handovers'
import { HandoverItem } from '@/shared/handover/HandoverItem'

// 공용 보기 부품: 인수인계 목록 · 사장/알바 화면이 함께 사용 — 담당: 민지
// live(오늘): 체크할 수 있고 처리한 항목은 흐리게. 지난 날짜: 모두 처리됨으로 보여 주고 체크 불가
interface HandoverListProps {
  items: HandoverItemData[]
  live: boolean
  isChecked: (id: string) => boolean
  onToggle: (id: string) => void
}

export function HandoverList({ items, live, isChecked, onToggle }: HandoverListProps) {
  return items.map((item) => {
    const done = live ? isChecked(item.id) : true
    return (
      <HandoverItem
        key={item.id}
        item={item}
        done={done}
        faded={live && done}
        subText={live ? item.tag : `${item.tag} · 처리됨`}
        disabled={!live}
        onToggle={() => onToggle(item.id)}
      />
    )
  })
}
