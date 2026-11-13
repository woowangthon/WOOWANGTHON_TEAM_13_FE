import { ArrowLeftRight } from 'lucide-react'
import { substituteErrorMessage } from '@/lib/api/substitute'
import { fromDateKey } from '@/lib/date'
import { formatDate } from '@/lib/format'
import { useOwnerReceivedRequests, useRespondOwnerRequest } from '@/pages/owner/api/fixedSchedule'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toastStore'

// 직원이 사장님께 부탁한 대타 (대기 중): [거절] · [수락] — 수락하면 그날 그 근무가 사장님 이름으로 바뀐다
export function ReceivedRequests({ storeId }: { storeId: string }) {
  const query = useOwnerReceivedRequests(storeId)
  const respond = useRespondOwnerRequest(storeId)
  const requests = query.data ?? []
  if (requests.length === 0) return null

  const answer = (requestId: string, accept: boolean) =>
    respond.mutate(
      { requestId, accept },
      {
        onSuccess: () =>
          toast(accept ? '대타를 수락했어요. 근무 달력에 반영돼요' : '대타를 거절했어요'),
        onError: (error) =>
          toast.error(substituteErrorMessage(error, '처리하지 못했어요. 다시 시도해 주세요')),
      },
    )

  return (
    <section className="flex flex-col gap-2" aria-label="받은 대타 요청">
      {requests.map((r) => (
        // 알바 근무 화면의 받은 대타 요청 카드와 같은 모양 (살구 바탕 · 라벨 옆 작은 아이콘 · 근무 → 설명, 11/14)
        <div
          key={r.requestId}
          className="flex flex-col gap-3 rounded-3xl bg-warm p-4 text-warm-foreground"
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[13px] font-bold">
              <ArrowLeftRight aria-hidden="true" className="size-4" />
              받은 대타 요청
            </span>
            <span className="text-base leading-[1.4] font-bold text-foreground tabular-nums">
              {formatDate(fromDateKey(r.date))} {r.shiftName} {r.start}–{r.end}
            </span>
            <span className="text-[13px] leading-[1.45] font-medium">
              {r.requester.name}님이 대신 일해 줄 수 있는지 물어봤어요
            </span>
          </span>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="white"
              size="md"
              disabled={respond.isPending}
              onClick={() => answer(r.requestId, false)}
            >
              거절
            </Button>
            <Button
              size="md"
              disabled={respond.isPending}
              onClick={() => answer(r.requestId, true)}
            >
              수락
            </Button>
          </div>
        </div>
      ))}
    </section>
  )
}
