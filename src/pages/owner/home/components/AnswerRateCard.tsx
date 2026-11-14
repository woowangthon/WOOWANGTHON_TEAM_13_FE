import { Check, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { AssistantStats } from '@/pages/owner/api/types'
import { Button } from '@/ui/Button'
import { Chip } from '@/ui/Chip'
import { cn } from '@/ui/utils'

// 사장님 데스크톱 홈 오른쪽 칸: AI 사수 답변율 (11/14, 인건비 링 자리)
// 이번 주 답변율(큰 숫자) → 막대 → 지난주와 비교 → 매뉴얼에 없던 질문(분류가 둘 이상이면 칩으로 고르기) → [매뉴얼 보강하기]
// 글자 · 색은 docs/08 단계와 토큰만: 카드 제목 16 · 큰 숫자 40 · 보조 13 · 캡션 12, 카드 안 질문 줄은 그림자 없는 흰 바탕
export function AnswerRateCard({ stats }: { stats: AssistantStats }) {
  const navigate = useNavigate()
  const rate = stats.total ? Math.round((stats.answered / stats.total) * 100) : 0
  // BE 는 못 답한 질문을 최근 몇 건만 보내므로, 건수는 목록 길이가 아니라 전체 - 답한 수로 센다
  const missed = Math.max(stats.total - stats.answered, 0)
  const shown = stats.unanswered.reduce((sum, group) => sum + group.questions.length, 0)
  // 지금 BE 는 분류를 나누지 않고 '기타' 하나로 보낸다 → 분류가 하나면 칩 · 분류 이름을 숨긴다
  const byCategory = stats.unanswered.length > 1
  const [picked, setPicked] = useState(stats.unanswered[0]?.category ?? null)
  const group = stats.unanswered.find((g) => g.category === picked) ?? stats.unanswered[0]

  return (
    <section
      aria-labelledby="answer-rate-title"
      className="flex flex-col gap-4 rounded-[26px] border border-line/60 bg-card p-5"
    >
      <h2 id="answer-rate-title" className="m-0 text-[16px] font-extrabold">
        AI 사수 답변율
      </h2>

      {stats.total === 0 ? (
        <p className="m-0 text-[13px] text-muted-foreground">이번 주에는 아직 질문이 없어요</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <p className="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-[40px] leading-[1.1] font-extrabold tracking-[-0.03em] tabular-nums">
                {rate}%
              </span>
              <span className="text-[13px] font-medium text-muted-foreground tabular-nums">
                이번 주 질문 {stats.total}건 중 {stats.answered}건
              </span>
            </p>
            <div
              role="progressbar"
              aria-label="AI 사수 답변율"
              aria-valuenow={rate}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 overflow-hidden rounded-full bg-brand-soft"
            >
              <div className="h-full rounded-full bg-brand" style={{ width: `${rate}%` }} />
            </div>
            {stats.lastWeekRate !== null && <Trend rate={rate} last={stats.lastWeekRate} />}
          </div>

          {missed === 0 || !group ? (
            <p className="m-0 flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
              <Check aria-hidden="true" className="size-4 text-brand" />
              이번 주 질문은 모두 매뉴얼로 답했어요
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-muted-foreground tabular-nums">
                매뉴얼에 없던 {missed}건{shown < missed && ` · 최근 ${shown}건`}
              </span>
              {byCategory && (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="매뉴얼 분류">
                  {stats.unanswered.map((g) => {
                    const on = g.category === group.category
                    return (
                      <Chip
                        key={g.category}
                        active={on}
                        aria-pressed={on}
                        onClick={() => setPicked(g.category)}
                        className={cn(
                          'h-9 border py-0 tabular-nums',
                          on ? 'border-transparent' : 'border-line/60',
                        )}
                      >
                        {g.category} {g.questions.length}
                      </Chip>
                    )
                  })}
                </div>
              )}
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {group.questions.map((q) => (
                  <li
                    key={q.questionId}
                    className="flex items-start justify-between gap-3 rounded-2xl bg-white px-4 py-3"
                  >
                    <span className="text-[15px] leading-[1.45] font-bold break-keep">
                      “{q.question}”
                    </span>
                    <span className="shrink-0 pt-0.5 text-xs font-medium text-muted-foreground">
                      {q.staffName}
                    </span>
                  </li>
                ))}
              </ul>
              <Button className="mt-1 h-12 w-full" onClick={() => navigate('/owner/manuals/new')}>
                {byCategory ? `${group.category} 매뉴얼 보강하기` : '매뉴얼 보강하기'}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

/** 지난주와 비교 칩: 오르면 매장 색 · 내리면 빨강 · 같으면 회색 */
function Trend({ rate, last }: { rate: number; last: number }) {
  const diff = rate - last
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus
  return (
    <span
      className={cn(
        'flex items-center gap-1 self-start rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
        diff > 0 && 'bg-brand-soft text-accent-foreground',
        diff < 0 && 'bg-destructive-soft text-destructive-foreground',
        diff === 0 && 'bg-muted text-muted-foreground',
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      {diff > 0
        ? `지난주 ${last}%보다 올랐어요`
        : diff < 0
          ? `지난주 ${last}%보다 내려갔어요`
          : `지난주와 같아요`}
    </span>
  )
}
