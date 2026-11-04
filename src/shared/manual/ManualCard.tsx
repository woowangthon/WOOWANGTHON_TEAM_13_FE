import { ChevronRight } from 'lucide-react'
import { Link, type To } from 'react-router'
import type { Manual } from '@/lib/api/types'
import { DEFAULT_MANUAL_ICON, MANUAL_ICON } from '@/shared/icons'
import { Badge } from '@/ui/Badge'

// 공용 보기 부품: 매뉴얼 카드 1장 · 사장/알바 화면이 함께 사용 — 담당: 민지
export function ManualCard({ manual, href }: { manual: Manual; href: To }) {
  const Icon = (manual.icon && MANUAL_ICON[manual.icon]) || DEFAULT_MANUAL_ICON
  return (
    <Link
      to={href}
      className="flex min-h-[170px] flex-col gap-[9px] rounded-[26px] bg-card p-4 text-foreground shadow-soft"
    >
      <span className="flex w-full items-start justify-between">
        <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Icon className="size-5" />
        </span>
        {manual.isNew && <Badge>NEW</Badge>}
      </span>
      <span className="text-[17px] font-bold">{manual.title}</span>
      <span className="line-clamp-2 text-[13px] leading-normal text-[#6B7068]">{manual.body}</span>
      <span className="mt-auto flex size-8 items-center justify-center self-end rounded-full bg-brand-soft text-brand">
        <ChevronRight className="size-5" />
      </span>
    </Link>
  )
}
