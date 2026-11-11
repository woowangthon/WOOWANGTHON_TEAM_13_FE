import { Card } from '@/ui/Card'

// 공용 보기 부품: 인수인계 AI 요약 결과 · 사장/알바 화면이 함께 사용 — 담당: 민지
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
    <Card variant="dark" className="gap-2.5 px-[22px] py-5">
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-lg font-extrabold">AI 요약</span>
        <span className="text-[13px] font-semibold whitespace-nowrap tabular-nums opacity-80">
          {from}
        </span>
      </div>
      <p className="m-0 text-sm leading-[1.65] text-balance whitespace-pre-line break-keep opacity-90">
        {summary}
      </p>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs font-bold whitespace-nowrap tabular-nums">
          {done} / {total} 처리
        </span>
      </div>
    </Card>
  )
}
