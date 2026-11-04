import { ChevronRight, FileText } from 'lucide-react'
import { Link } from 'react-router'
import type { Source } from '@/lib/api/types'

// 채팅 부품: 답변 출처 카드 — 누르면 원본 레시피 · 매뉴얼을 연다 ("레시피 › 딸기라떼")
export function SourceCard({ source }: { source: Source }) {
  const to =
    source.kind === 'recipe' ? `/staff/recipes/${source.id}` : `/staff/manuals/${source.id}`
  const label = `${source.kind === 'recipe' ? '레시피' : '매뉴얼'} › ${source.title}`
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 self-start rounded-full bg-accent py-2 pr-3 pl-2.5 text-[13px] text-accent-foreground"
    >
      <FileText className="size-4" />
      <span>
        <span className="sr-only">출처: </span>
        {label}
      </span>
      <ChevronRight className="size-4" />
    </Link>
  )
}
