import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import type { Source } from '@/lib/api/types'
import { PRESSABLE } from '@/shared/pressable'
import { cn } from '@/ui/utils'

// 채팅 부품: 답변 출처 칩 — 누르면 원본 레시피 · 매뉴얼을 연다 ("레시피 › 딸기라떼").
// AI 말풍선 바로 아래 작은 알약 (높이 36 · 13px, 옅은 매장 색)
export function SourceCard({ source }: { source: Source }) {
  const to =
    source.kind === 'recipe' ? `/staff/recipes/${source.id}` : `/staff/manuals/${source.id}`
  const label = `${source.kind === 'recipe' ? '레시피' : '매뉴얼'} › ${source.title}`
  return (
    <Link
      to={to}
      className={cn(
        'flex h-9 items-center gap-1 rounded-full bg-accent pr-2.5 pl-3.5 text-[13px] font-bold text-accent-foreground',
        PRESSABLE,
      )}
    >
      <span>
        <span className="sr-only">출처: </span>
        {label}
      </span>
      <ChevronRight aria-hidden="true" className="size-4" />
    </Link>
  )
}
