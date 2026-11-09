import { Link, type To } from 'react-router'
import type { Manual } from '@/lib/api/types'
import { DEFAULT_MANUAL_ICON, MANUAL_ICON } from '@/shared/icons'
import { findPassword, manualPreview } from '@/shared/manual/manualText'
import { PRESSABLE_CARD } from '@/shared/pressable'
import { Badge } from '@/ui/Badge'
import { cn } from '@/ui/utils'

// 공용 보기 부품: 매뉴얼 카드 1장 · 사장/알바 화면이 함께 사용 — 담당: 민지
// 카드 전체가 링크라 화살표는 두지 않는다. 미리보기는 첫 줄(첫 단계)만, 비밀번호는 굵게
export function ManualCard({ manual, href }: { manual: Manual; href: To }) {
  const Icon = (manual.icon && MANUAL_ICON[manual.icon]) || DEFAULT_MANUAL_ICON
  const preview = manualPreview(manual.body)
  const password = findPassword(preview)
  const at = password ? preview.indexOf(password) : -1
  return (
    <Link
      to={href}
      // 상세는 목록 위에 뜨는 시트라 목록 스크롤 자리를 그대로 둔다
      preventScrollReset
      className={cn(
        'flex flex-col gap-[9px] rounded-[26px] bg-card p-4 text-foreground shadow-soft',
        PRESSABLE_CARD,
      )}
    >
      <span className="flex w-full items-start justify-between">
        <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Icon className="size-5" />
        </span>
        {manual.isNew && <Badge>NEW</Badge>}
      </span>
      <span className="text-[17px] font-bold">{manual.title}</span>
      <span className="line-clamp-2 text-[13px] leading-normal break-keep text-muted-foreground">
        {at >= 0 ? (
          <>
            {preview.slice(0, at)}
            <strong className="font-bold text-foreground">{password}</strong>
            {preview.slice(at + password!.length)}
          </>
        ) : (
          preview
        )}
      </span>
    </Link>
  )
}
