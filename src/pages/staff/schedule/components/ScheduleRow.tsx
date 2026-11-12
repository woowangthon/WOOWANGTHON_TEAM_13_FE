import type { ReactNode } from 'react'
import { cn } from '@/ui/utils'

/**
 * 근무표 날짜 목록 한 줄 (앱 일정 목록 모양) — 담당: 민지
 * 왼쪽 시간 열(시작 위 · 끝 아래, 고정폭 숫자) · 사람 색 세로 줄(3px, 둥근 끝) · 가운데 제목(+ 칩) / 아래 줄 · 오른쪽 위 작은 글자.
 * 내 근무는 줄 바탕을 아주 연한 매장 색으로. action 은 줄 오른쪽 아래 (대타 요청 알약 · 요청 중 · 상태 칩)
 * 카드 한 장 안에서 쓴다 — 줄 사이 얇은 구분선은 이 줄이 그린다 (마지막 줄은 없음)
 */
export function ScheduleRow({
  start,
  end,
  color,
  mine = false,
  title,
  sub,
  right,
  action,
}: {
  start: string
  end: string
  /** 사람 색 (personColor 의 진한 쪽) */
  color: string
  mine?: boolean
  title: ReactNode
  sub: ReactNode
  /** 오른쪽 위 작은 글자 (예: 5시간) */
  right?: ReactNode
  action?: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex gap-3 border-b border-line/60 px-4 py-3 last:border-b-0',
        mine && 'bg-brand-soft/50',
      )}
    >
      <span className="flex w-11 shrink-0 flex-col pt-0.5 leading-[1.4] tabular-nums">
        <span className="text-[13px] font-bold">{start}</span>
        <span className="text-xs font-medium text-muted-foreground">{end}</span>
      </span>
      <span
        aria-hidden="true"
        className="w-0.75 shrink-0 self-stretch rounded-full"
        style={{ background: color }}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className="flex min-w-0 items-center gap-1.5 text-[15px] leading-[1.4] font-bold">
            {title}
          </span>
          {right && (
            <span className="ml-auto shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
              {right}
            </span>
          )}
        </span>
        <span className="text-[13px] font-medium text-muted-foreground">{sub}</span>
        {action && <span className="mt-1.5 flex justify-end">{action}</span>}
      </span>
    </div>
  )
}
