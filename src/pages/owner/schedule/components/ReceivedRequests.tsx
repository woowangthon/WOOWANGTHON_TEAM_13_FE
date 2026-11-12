import { Repeat } from 'lucide-react'
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
    <section className="flex flex-col gap-2.5">
      {requests.map((r) => (
        // 연한 주황: warm 토큰을 흰색과 반씩 섞음 (토큰은 알바 화면도 써서 그대로 둔다)
        <div
          key={r.requestId}
          className="flex flex-col gap-3 rounded-[24px] bg-[color-mix(in_srgb,var(--warm)_50%,white)] p-4"
        >
          <div className="flex items-start gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-warm-foreground">
              <Repeat className="size-[18px]" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-bold break-keep text-warm-foreground">
                {r.requester.name} 님이 대타를 부탁했어요
              </span>
              <span className="text-[13px] text-warm-foreground/80">
                {formatDate(fromDateKey(r.date))} · {r.shiftName} {r.start}~{r.end}
              </span>
            </div>
          </div>
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
