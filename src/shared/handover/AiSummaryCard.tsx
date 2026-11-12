import { Sparkles } from 'lucide-react'

// 공용 보기 부품: 인수인계 AI 요약 결과 · 사장/알바 화면이 함께 사용 — 담당: 민지
// 연한 매장 색 카드 + 진한 글자 (docs/08: 진한 덩어리는 한 화면 1개 — 홈은 오늘 근무 사진 카드). ✦ 는 "AI 가 만든 내용" 표시로 여기 한 곳만
interface AiSummaryCardProps {
  /** 카드 위 작은 글씨 (예: 2명이 남김) */
  from: string
  /** 요약 (줄바꿈하면 줄마다 나눠서 보여 준다) */
  summary: string
  /** 처리한 항목 수 / 전체 항목 수 */
  done: number
  total: number
}

export function AiSummaryCard({ from, summary, done, total }: AiSummaryCardProps) {
  const percent = total ? Math.round((done / total) * 100) : 0
  return (
    <section aria-label="AI 요약" className="flex flex-col gap-3 rounded-3xl bg-brand-soft p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-base font-bold">
          <Sparkles aria-hidden="true" className="size-4 text-brand" fill="currentColor" />
          AI 요약
        </span>
        <span className="text-xs font-medium whitespace-nowrap text-muted-foreground tabular-nums">
          {from}
        </span>
      </div>
      <p className="m-0 text-[15px] leading-[1.55] text-pretty whitespace-pre-line break-keep">
        {summary}
      </p>
      <div className="flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-card">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs font-bold whitespace-nowrap tabular-nums">
          {done} / {total} 처리
        </span>
      </div>
    </section>
  )
}
