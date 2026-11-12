import type { ReactNode } from 'react'
import type { To } from 'react-router'
import type { Manual } from '@/lib/api/types'
import { ManualCard } from '@/shared/manual/ManualCard'
import { useRevealChildren } from '@/shared/useReveal'
import { EmptyState } from '@/ui/EmptyState'
import { cn } from '@/ui/utils'

// 공용 보기 부품: 매뉴얼 바둑판 · 사장/알바 화면이 함께 사용 — 담당: 민지
// 누르면 갈 주소는 화면마다 달라서 getHref 로 받는다 (알바 /staff/manuals/:id · 사장 /owner/manuals/:id)
// variant="clean": ManualCard clean + 모든 줄 높이를 같게(auto-rows-fr) · 카드 사이 8px (docs/08)
interface ManualGridProps {
  manuals: Manual[]
  getHref: (manual: Manual) => To
  /** 매뉴얼이 없을 때 보여 줄 것 (없으면 기본 문구) */
  empty?: ReactNode
  variant?: 'default' | 'clean'
}

export function ManualGrid({ manuals, getHref, empty, variant = 'default' }: ManualGridProps) {
  // clean 만: 스크롤해서 처음 보이는 줄마다 살짝 떠오르기 (shared/useReveal)
  const gridRef = useRevealChildren<HTMLDivElement>(
    [manuals.map((m) => m.manualId).join()],
    variant === 'clean',
  )
  if (manuals.length === 0) return empty ?? <EmptyState message="아직 등록된 매뉴얼이 없어요" />

  return (
    <div
      ref={gridRef}
      className={cn('grid grid-cols-2', variant === 'clean' ? 'auto-rows-fr gap-2' : 'gap-2.5')}
    >
      {manuals.map((m) => (
        <ManualCard key={m.manualId} manual={m} href={getHref(m)} variant={variant} />
      ))}
    </div>
  )
}
