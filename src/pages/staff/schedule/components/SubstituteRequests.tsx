import { ArrowLeftRight, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import {
  isFinalSubstituteError,
  substituteErrorMessage,
  useRespondSubstitute,
  useSubstituteRequests,
} from '@/lib/api/substitute'
import type { SubstituteRequest, SubstituteStatus } from '@/lib/api/types'
import { fromDateKey } from '@/lib/date'
import { formatDate } from '@/lib/format'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 대타 요청 카드들 (근무표 탭): 받은 요청(대기 중) [거절] [수락] · 보낸 요청 상태(대기 · 수락됨 · 거절됨)

const shiftText = (r: SubstituteRequest) =>
  `${formatDate(fromDateKey(r.date))} ${r.shiftName || '근무'} ${r.start}–${r.end}`

/** 받은 대타 요청 (대기 중만) — 근무표 맨 위 */
export function ReceivedSubstitutes() {
  const { store } = useCurrentStore()
  const query = useSubstituteRequests(store.id, 'received')
  const respond = useRespondSubstitute(store.id)
  const pending = (query.data?.requests ?? []).filter((r) => r.status === 'PENDING')
  if (pending.length === 0) return null

  const answer = (request: SubstituteRequest, accept: boolean) =>
    respond.mutate(
      { requestId: request.requestId, accept },
      {
        onSuccess: () =>
          toast(
            accept
              ? `대타를 수락했어요. ${formatDate(fromDateKey(request.date))} 근무가 내 이름으로 바뀌었어요`
              : `${request.requester.name}님의 대타 요청을 거절했어요`,
          ),
        onError: (error) =>
          toast.error(substituteErrorMessage(error, '처리하지 못했어요. 다시 시도해 주세요'), {
            onRetry: isFinalSubstituteError(error) ? undefined : () => answer(request, accept),
          }),
      },
    )

  return (
    <section className="flex flex-col gap-2" aria-label="받은 대타 요청">
      {pending.map((r) => (
        <div
          key={r.requestId}
          className="flex flex-col gap-3 rounded-[22px] bg-warm px-4 py-4 text-warm-foreground"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/70">
              <ArrowLeftRight className="size-[18px]" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13px] font-bold">받은 대타 요청</span>
              <span className="text-base font-extrabold text-foreground tabular-nums">
                {shiftText(r)}
              </span>
              <span className="text-[13px]">
                {r.requester.name}님이 대신 일해 줄 수 있는지 물어봤어요
              </span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="white"
              size="md"
              disabled={respond.isPending}
              onClick={() => answer(r, false)}
            >
              거절
            </Button>
            <Button size="md" disabled={respond.isPending} onClick={() => answer(r, true)}>
              수락
            </Button>
          </div>
        </div>
      ))}
    </section>
  )
}

const STATUS: Record<SubstituteStatus, { label: string; className: string }> = {
  PENDING: { label: '대기', className: 'bg-warm text-warm-foreground' },
  ACCEPTED: { label: '수락됨', className: 'bg-brand-soft text-brand' },
  REJECTED: { label: '거절됨', className: 'bg-destructive-soft text-destructive-foreground' },
  CANCELLED: { label: '취소됨', className: 'bg-muted text-muted-foreground' },
}

/** 내가 보낸 대타 요청 상태 (최근 5개) — 근무표 아래 작게 */
export function SentSubstitutes() {
  const { store } = useCurrentStore()
  const query = useSubstituteRequests(store.id, 'sent')
  const requests = (query.data?.requests ?? []).slice(0, 5)
  if (requests.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 px-1 text-[15px] font-extrabold">보낸 대타 요청</h2>
      <ul className="m-0 flex list-none flex-col rounded-[20px] bg-card px-4 py-1 shadow-soft">
        {requests.map((r) => (
          <li
            key={r.requestId}
            className="flex items-center justify-between gap-3 border-b border-[#F0EBE2] py-3 last:border-b-0"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-bold tabular-nums">{shiftText(r)}</span>
              <span className="text-xs text-muted-foreground">{r.target.name}님에게 요청</span>
            </span>
            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold',
                STATUS[r.status].className,
              )}
            >
              {STATUS[r.status].label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** 홈 한 줄 배너: 대기 중인 받은 대타 요청이 있으면 (누르면 근무표로) */
export function ReceivedSubstituteBanner({ storeId }: { storeId: string }) {
  const query = useSubstituteRequests(storeId, 'received')
  const pending = (query.data?.requests ?? []).filter((r) => r.status === 'PENDING')
  if (pending.length === 0) return null
  const first = pending[0]
  return (
    <Link
      to="/staff/schedule"
      className="flex items-center gap-3 rounded-[18px] bg-warm px-4 py-3 text-warm-foreground"
    >
      <ArrowLeftRight className="size-[18px] shrink-0" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
        {pending.length > 1
          ? `받은 대타 요청 ${pending.length}건이 있어요`
          : `${first.requester.name}님이 ${formatDate(fromDateKey(first.date))} 대타를 요청했어요`}
      </span>
      <ChevronRight className="size-[18px] shrink-0" />
    </Link>
  )
}
