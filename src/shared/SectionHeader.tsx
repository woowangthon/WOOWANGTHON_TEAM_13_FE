import type { ReactNode } from 'react'
import { Link, type To } from 'react-router'
import { PRESSABLE } from '@/shared/pressable'
import { cn } from '@/ui/utils'

/*
 * 공용 보기 부품: 섹션 제목 줄 · 사장/알바 화면이 함께 사용 — 담당: 민지 (docs/08 2. 글자 · 섹션 제목)
 * 왼쪽 섹션 제목(19px · 700) + 오른쪽 작은 동작 버튼(알약 32px). 동작이 없으면 제목만
 *
 * 사용 예:
 *   <SectionHeader title="오늘의 인수인계" action={{ label: '남기기', to: '/staff/handover' }} />
 *   <SectionHeader title="11/20(금) 근무" />
 */
export function SectionHeader({
  title,
  action,
  id,
  className,
}: {
  title: ReactNode
  /** 오른쪽 작은 버튼 (다른 화면으로 가는 링크) */
  action?: { label: string; to: To }
  /** 제목(h2)의 id — aria-labelledby 용 */
  id?: string
  className?: string
}) {
  return (
    <div className={cn('flex min-h-8 items-center justify-between gap-3 px-1', className)}>
      <h2 id={id} className="m-0 text-[19px] leading-[1.3] font-bold tracking-[-0.02em]">
        {title}
      </h2>
      {action && (
        <Link
          to={action.to}
          className={cn(
            'flex h-8 shrink-0 items-center rounded-full bg-secondary px-3 text-[13px] font-bold whitespace-nowrap text-foreground',
            PRESSABLE,
          )}
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
