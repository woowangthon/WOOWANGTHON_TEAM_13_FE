import { Link, type To } from 'react-router'
import type { Manual } from '@/lib/api/types'
import { DEFAULT_MANUAL_ICON, MANUAL_ICON } from '@/shared/icons'
import { findPassword, manualPreview } from '@/shared/manual/manualText'
import { PRESSABLE, PRESSABLE_CARD } from '@/shared/pressable'
import { Badge } from '@/ui/Badge'
import { cn } from '@/ui/utils'

// 공용 보기 부품: 매뉴얼 카드 1장 · 사장/알바 화면이 함께 사용 — 담당: 민지
// 카드 전체가 링크라 화살표는 두지 않는다. 미리보기는 첫 줄(첫 단계)만, 비밀번호는 굵게
// variant
//   default: 아이콘 동그라미 + 제목 17px + 그림자 (지금 사장님 화면)
//   clean:   아이콘 없이 제목(16 · 두 줄까지) → 미리보기(13 · 두 줄까지), 그림자 없음, 격자 안에서 높이를 꽉 채운다 (docs/08 · 알바 화면)
export function ManualCard({
  manual,
  href,
  variant = 'default',
}: {
  manual: Manual
  href: To
  variant?: 'default' | 'clean'
}) {
  const Icon = (manual.icon && MANUAL_ICON[manual.icon]) || DEFAULT_MANUAL_ICON
  const preview = manualPreview(manual.body)
  const password = findPassword(preview)
  const at = password ? preview.indexOf(password) : -1
  const previewText =
    at >= 0 ? (
      <>
        {preview.slice(0, at)}
        <strong className="font-bold text-foreground">{password}</strong>
        {preview.slice(at + password!.length)}
      </>
    ) : (
      preview
    )

  if (variant === 'clean') {
    return (
      <Link
        to={href}
        preventScrollReset
        className={cn(
          'flex h-full flex-col gap-1 rounded-3xl bg-card p-4 text-foreground',
          PRESSABLE,
        )}
      >
        <span className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-base leading-[1.4] font-bold tracking-[-0.01em] break-keep">
            {manual.title}
          </span>
          {manual.isNew && <Badge className="mt-0.5">NEW</Badge>}
        </span>
        <span className="line-clamp-2 text-[13px] leading-[1.45] font-medium break-keep text-muted-foreground tabular-nums">
          {previewText}
        </span>
      </Link>
    )
  }

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
        {previewText}
      </span>
    </Link>
  )
}
