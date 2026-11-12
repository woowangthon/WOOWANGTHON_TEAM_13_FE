import { ArrowLeftRight, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { useNotifications } from '@/lib/api/notifications'
import {
  isFinalSubstituteError,
  substituteErrorMessage,
  useRespondSubstitute,
  useSubstituteRequests,
} from '@/lib/api/substitute'
import type { SubstituteRequest, SubstituteStatus } from '@/lib/api/types'
import { fromDateKey } from '@/lib/date'
import { formatDate } from '@/lib/format'
import { PersonInitial } from '@/pages/staff/schedule/components/PersonInitial'
import type { PersonColor } from '@/pages/staff/schedule/personColor'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { PRESSABLE } from '@/shared/pressable'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 대타 요청 카드들 (근무표 탭): 받은 요청(대기 중) [거절] [수락] · 그날 보낸 요청 상태(대기 · 수락됨 · 거절됨 · 취소됨)

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
          // 살구 바탕 = 사람이 기다리는 것 (docs/08 4). 아이콘 동그라미 없이 라벨 옆 작은 아이콘
          className="flex flex-col gap-3 rounded-3xl bg-warm p-4 text-warm-foreground"
        >
          <div className="flex items-start gap-3">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[13px] font-bold">
                <ArrowLeftRight aria-hidden="true" className="size-4" />
                받은 대타 요청
              </span>
              <span className="text-base leading-[1.4] font-bold text-foreground tabular-nums">
                {shiftText(r)}
              </span>
              <span className="text-[13px] leading-[1.45] font-medium">
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

/**
 * 그날 내가 보낸 대타 요청 — 근무표에서 날짜를 누르면 그날 근무 목록 아래 작은 카드 (없으면 안 보임).
 * 줄마다 "마감 18:00–23:00" + (동그라미) "민수님에게 요청" + 상태 칩. 수락돼서 근무가 넘어간 날도 여기서 기록이 보인다
 */
export function SentSubstitutesOfDay({
  requests,
  colorOf,
}: {
  requests: SubstituteRequest[]
  colorOf: (userId: string) => PersonColor
}) {
  if (requests.length === 0) return null
  return (
    <div className="flex flex-col gap-1 rounded-3xl border border-line/60 bg-card px-4 pt-3 pb-1">
      <span className="text-xs font-bold text-muted-foreground">보낸 대타 요청</span>
      <ul className="m-0 flex list-none flex-col p-0">
        {requests.map((r) => (
          <li
            key={r.requestId}
            className="flex items-center justify-between gap-3 border-b border-line/60 py-2.5 last:border-b-0"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-[15px] font-bold tabular-nums">
                {r.shiftName || '근무'} {r.start}–{r.end}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <PersonInitial name={r.target.name} color={colorOf(r.target.userId)} size={18} />
                {r.target.name}님에게 요청
              </span>
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
    </div>
  )
}

/**
 * 홈 한 줄 배너: 안 읽은 "대타 요청이 왔어요" 알림이 있으면 (누르면 근무표로).
 * 알림 API 기준이라 홈을 열기만 해서는 대타 요청이 읽음 처리되지 않는다.
 * 근무표에서 이미 수락 · 거절한 요청(받아 둔 목록에 대기가 아님)은 빼고 보여 준다
 */
export function ReceivedSubstituteBanner({ storeId }: { storeId: string }) {
  const feed = useNotifications(storeId).data
  const received = useSubstituteRequests(storeId, 'received', false).data
  const answered = new Set(
    (received?.requests ?? []).filter((r) => r.status !== 'PENDING').map((r) => r.requestId),
  )
  const unread = (feed?.notifications ?? []).filter(
    (n) => n.type === 'SUBSTITUTE_REQUESTED' && !n.isRead && !answered.has(n.target.id),
  )
  if (unread.length === 0) return null
  return (
    <Link
      to="/staff/schedule"
      // 한 줄 배너: 살구 바탕(사람이 기다리는 것) + 진한 글자, 모서리 16px (docs/08)
      className={cn(
        'flex items-center gap-3 rounded-2xl bg-warm px-4 py-3.5 text-foreground',
        PRESSABLE,
      )}
    >
      <ArrowLeftRight aria-hidden="true" className="size-5 shrink-0 text-warm-foreground" />
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
        {unread.length > 1 ? `받은 대타 요청 ${unread.length}건이 있어요` : unread[0].body}
      </span>
      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-warm-foreground" />
    </Link>
  )
}
