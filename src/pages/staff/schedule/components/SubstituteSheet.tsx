import { Check } from 'lucide-react'
import { useState } from 'react'
import { myUserId } from '@/lib/api/schedule'
import {
  isFinalSubstituteError,
  substituteErrorMessage,
  useCreateSubstituteRequest,
  useScheduleWorkers,
} from '@/lib/api/substitute'
import type { CalendarShift } from '@/lib/api/types'
import { fromDateKey } from '@/lib/date'
import { formatDate } from '@/lib/format'
import { LoadError } from '@/shared/LoadError'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { Spinner } from '@/ui/Spinner'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 대타 요청 보내기 시트: 내 근무 하나 → 대신 일할 사람 고르기(나 빼고, 알바생 먼저 · 사장님은 아래) → 보내기
// 그 사람이 수락하면 그날 그 근무가 그 사람 이름으로 바뀐다 (알림은 연서님 알림 API 후 챕터 D)
export function SubstituteSheet({
  storeId,
  shift,
  onClose,
}: {
  storeId: string
  shift: CalendarShift
  onClose: () => void
}) {
  const workersQuery = useScheduleWorkers(storeId)
  const create = useCreateSubstituteRequest(storeId)
  const [targetId, setTargetId] = useState<string | null>(null)
  const me = myUserId()

  const workers = (workersQuery.data?.workers ?? [])
    .filter((w) => w.userId !== me && w.memberId !== null)
    .sort((a, b) => (a.role === b.role ? 0 : a.role === 'owner' ? 1 : -1))
  const target = workers.find((w) => w.userId === targetId)

  const send = () => {
    if (!target) return
    create.mutate(
      { assignmentId: shift.assignmentId, date: shift.date, targetUserId: target.userId },
      {
        onSuccess: () => {
          toast(`${target.name}님에게 대타를 요청했어요`)
          onClose()
        },
        onError: (error) =>
          toast.error(
            substituteErrorMessage(error, '대타를 요청하지 못했어요. 다시 시도해 주세요'),
            {
              onRetry: isFinalSubstituteError(error) ? undefined : send,
            },
          ),
      },
    )
  }

  return (
    <BottomSheet open onClose={onClose} label="대타 요청" closeButton>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 pr-10">
          <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">대타 요청</h2>
          <p className="m-0 text-sm text-muted-foreground tabular-nums">
            {formatDate(fromDateKey(shift.date))} {shift.name || '근무'} {shift.start} – {shift.end}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="px-1 text-[13px] font-bold text-muted-foreground">대신 일할 사람</span>
          {workersQuery.isError ? (
            <LoadError
              what="함께 일하는 사람을"
              error={workersQuery.error}
              onRetry={() => workersQuery.refetch()}
            />
          ) : !workersQuery.data ? (
            <Spinner className="py-6" />
          ) : workers.length === 0 ? (
            <p className="m-0 rounded-[18px] bg-background px-4 py-4 text-sm text-muted-foreground">
              함께 일하는 사람이 아직 없어요
            </p>
          ) : (
            <div role="radiogroup" aria-label="대신 일할 사람" className="flex flex-col gap-2">
              {workers.map((w) => {
                const on = w.userId === targetId
                return (
                  <button
                    key={w.userId}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setTargetId(w.userId)}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-[18px] border-[1.5px] bg-white px-4 py-3.5 text-left transition-colors duration-150',
                      on ? 'border-brand' : 'border-transparent',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base font-bold">{w.name}</span>
                      {/* 이름에 이미 "사장님"이 있으면 또 붙이지 않는다 */}
                      {w.role === 'owner' && !w.name.includes('사장님') && (
                        <span className="text-xs font-semibold text-muted-foreground">사장님</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full border-[1.5px] text-white transition-colors duration-150',
                        on ? 'border-brand bg-brand' : 'border-line',
                      )}
                    >
                      {on && <Check className="size-4" strokeWidth={3} />}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <Button className="h-[54px]" disabled={!target || create.isPending} onClick={send}>
          {target ? `${target.name}님에게 요청 보내기` : '사람을 골라 주세요'}
        </Button>
      </div>
    </BottomSheet>
  )
}
