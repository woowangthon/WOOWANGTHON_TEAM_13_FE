import type { To } from 'react-router'
import type { Manual } from '@/lib/api/types'
import { ManualCard } from '@/shared/manual/ManualCard'
import { EmptyState } from '@/ui/EmptyState'

// 공용 보기 부품: 매뉴얼 바둑판 · 사장/알바 화면이 함께 사용 — 담당: 민지
// 누르면 갈 주소는 화면마다 달라서 getHref 로 받는다 (알바 /staff/manuals/:id · 사장 /owner/manuals/:id)
interface ManualGridProps {
  manuals: Manual[]
  getHref: (manual: Manual) => To
}

export function ManualGrid({ manuals, getHref }: ManualGridProps) {
  if (manuals.length === 0) return <EmptyState message="아직 등록된 매뉴얼이 없어요" />

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {manuals.map((m) => (
        <ManualCard key={m.manualId} manual={m} href={getHref(m)} />
      ))}
    </div>
  )
}
