import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toastApiError } from '@/lib/api/errors'
import { fromDateKey } from '@/lib/date'
import { formatDate } from '@/lib/format'
import {
  canOwnerTakeShift,
  useAvailabilityStatus,
  useConfirmDraft,
  useCreateDraft,
  useFillDraft,
  useScheduleDraft,
} from '@/pages/owner/api/work'
import type { DraftRow } from '@/pages/owner/api/types'
import { Button } from '@/ui/Button'
import { Spinner } from '@/ui/Spinner'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 다음 달 가능 시간 제출 현황 + 추천 스케줄 (P1, docs/03 S6): 추천 1개 → 부족한 칸 직접 채우기 → 확정 · 알림
// 진짜 API 는 사장님 배정이 아직 없어서, 부족해도 그대로 확정할 수 있고 부족한 칸은 표시만 한다
export function ScheduleDraftCard({ storeId }: { storeId: string }) {
  const availability = useAvailabilityStatus(storeId)
  const draftQuery = useScheduleDraft(storeId)
  const create = useCreateDraft(storeId)
  const fill = useFillDraft(storeId)
  const confirm = useConfirmDraft(storeId)
  const draft = draftQuery.data
  const a = availability.data
  const shortage = draft?.rows.filter((r) => r.shortage > 0 || (r.openShortage ?? 0) > 0) ?? []
  const ownerFill = canOwnerTakeShift()
  // 한 달 추천은 길어서 한 주(월~일)씩 넘겨 본다
  const weeks = weeksOf(draft?.rows ?? [])
  const [weekIndex, setWeekIndex] = useState(0)
  const page = Math.min(weekIndex, Math.max(weeks.length - 1, 0))
  const rows = weeks[page] ?? []

  const onError = (message: string) => (error: unknown) => toastApiError(error, message)

  return (
    <div className="flex flex-col gap-3">
      {a && (
        <div className="flex items-center justify-between gap-2.5 px-1.5 text-xs text-muted-foreground">
          <span>
            {Number(a.month.slice(5))}월 가능 시간 제출 {a.submitted}/{a.total}
            {a.missing.length > 0 && ` · ${a.missing.join(' · ')} 미제출`}
          </span>
          <span className="whitespace-nowrap">마감 {formatDate(fromDateKey(a.deadline))}</span>
        </div>
      )}

      {draftQuery.isPending ? (
        <Spinner />
      ) : !draft || draft.status === 'none' ? (
        <button
          type="button"
          disabled={create.isPending}
          onClick={() =>
            create.mutate(undefined, { onError: onError('만들지 못했어요. 다시 시도해 주세요') })
          }
          className="flex items-center justify-between gap-3 rounded-[28px] bg-ink texture py-5 pr-5 pl-[22px] text-left text-white"
        >
          <span className="flex flex-col gap-[5px]">
            <span className="text-lg font-extrabold">
              {create.isPending ? '추천 스케줄 만드는 중…' : '추천 스케줄 만들기'}
            </span>
            <span className="text-[13px] opacity-75">{draft?.weekLabel ?? ''}</span>
          </span>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-foreground">
            <Sparkles className="size-[22px]" />
          </span>
        </button>
      ) : (
        <section className="flex flex-col gap-2.5 rounded-[28px] bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-[3px]">
              <h3 className="m-0 text-lg font-extrabold">추천 스케줄</h3>
              <span className="text-[13px] text-muted-foreground">{draft.weekLabel}</span>
            </div>
            <span
              className={cn(
                'rounded-full px-[11px] py-1.5 text-xs font-bold whitespace-nowrap',
                draft.status === 'confirmed'
                  ? 'bg-accent text-brand'
                  : shortage.length
                    ? 'bg-[#FBEDEB] text-[#C0463F]'
                    : 'bg-background text-[#3E4642]',
              )}
            >
              {draft.status === 'confirmed'
                ? '확정'
                : shortage.length
                  ? `${shortage.length}칸 부족`
                  : '조정 완료'}
            </span>
          </div>

          <div className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)] gap-1.5 pt-1.5 pb-0.5 text-xs font-semibold text-subtle">
            <span />
            <span className="pl-1.5">오픈</span>
            <span className="pl-1.5">마감</span>
          </div>
          {weeks.length > 1 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                aria-label="이전 주"
                disabled={page === 0}
                onClick={() => setWeekIndex(page - 1)}
                className="flex size-8 items-center justify-center rounded-full bg-background disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-[13px] font-bold">
                {formatDate(fromDateKey(rows[0].date))} ~{' '}
                {formatDate(fromDateKey(rows[rows.length - 1].date))}
              </span>
              <button
                type="button"
                aria-label="다음 주"
                disabled={page === weeks.length - 1}
                onClick={() => setWeekIndex(page + 1)}
                className="flex size-8 items-center justify-center rounded-full bg-background disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
          {rows.map((row) => {
            const short = row.shortage > 0
            return (
              <div
                key={row.date}
                className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)] gap-1.5"
              >
                <span className="flex items-center text-[13px] font-bold whitespace-nowrap">
                  {formatDate(fromDateKey(row.date))}
                </span>
                <span
                  className={cn(
                    'rounded-[14px] border px-2.5 py-[11px] text-[13px] font-semibold',
                    row.openShortage
                      ? 'border-[#F0C9C4] bg-[#FBEDEB] text-[#C0463F]'
                      : 'border-transparent bg-background',
                  )}
                >
                  {row.open.join(' · ')}
                  {!!row.openShortage &&
                    `${row.open.length ? ' · ' : ''}${row.openShortage}명 부족`}
                </span>
                <button
                  type="button"
                  disabled={!short || !ownerFill || draft.status === 'confirmed' || fill.isPending}
                  onClick={() =>
                    fill.mutate(row.date, {
                      onSuccess: () =>
                        toast(`${formatDate(fromDateKey(row.date))} 마감에 사장님을 넣었어요`),
                      onError: onError('바꾸지 못했어요. 다시 시도해 주세요'),
                    })
                  }
                  className={cn(
                    'rounded-[14px] border px-2.5 py-[11px] text-left text-[13px] font-semibold disabled:cursor-default',
                    short
                      ? 'border-[#F0C9C4] bg-[#FBEDEB] text-[#C0463F]'
                      : 'border-transparent bg-background text-[#1C2420]',
                  )}
                >
                  {row.close.join(' · ')}
                  {short && `${row.close.length ? ' · ' : ''}${row.shortage}명 부족`}
                </button>
              </div>
            )
          })}

          {shortage.length > 0 && draft.status !== 'confirmed' && (
            <div className="rounded-2xl bg-destructive-soft px-3.5 py-3 text-[13px] text-destructive-foreground">
              {ownerFill
                ? `${shortage.map((r) => formatDate(fromDateKey(r.date))).join(' · ')} 마감 부족 · 칸을 눌러 사장님이 근무해요`
                : `${shortage.map((r) => formatDate(fromDateKey(r.date))).join(' · ')} 인원 부족 · 확정한 뒤 근무 달력에서 직원을 더 넣을 수 있어요`}
            </div>
          )}

          <Button
            className="mt-1.5"
            disabled={
              draft.status === 'confirmed' ||
              (ownerFill && shortage.length > 0) ||
              confirm.isPending
            }
            onClick={() =>
              confirm.mutate(undefined, {
                onSuccess: () => toast('근무표를 확정하고 알바생에게 알렸어요'),
                onError: onError('확정하지 못했어요. 다시 시도해 주세요'),
              })
            }
          >
            {draft.status === 'confirmed' ? '알림 보냈어요' : '확정하고 알리기'}
          </Button>
        </section>
      )}
    </div>
  )
}

/** 날짜 줄을 월요일 기준 주로 나눈다 */
function weeksOf(rows: DraftRow[]): DraftRow[][] {
  const weeks: DraftRow[][] = []
  for (const row of rows) {
    if (weeks.length === 0 || fromDateKey(row.date).getDay() === 1) weeks.push([])
    weeks[weeks.length - 1].push(row)
  }
  return weeks
}
