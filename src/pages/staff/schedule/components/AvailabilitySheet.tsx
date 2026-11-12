import { errorMessage, toastApiError } from '@/lib/api/errors'
import { AVAILABILITY_MEMO_MAX, useMyAvailability, useSubmitAvailability } from '@/lib/api/schedule'
import { ApiError } from '@/lib/apiClient'
import type { AvailabilityDay, MyAvailability } from '@/lib/api/types'
import {
  useStaffStore,
  type AvailabilityDraft,
  type AvailabilityMark,
} from '@/pages/staff/staffStore'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { LoadError } from '@/shared/LoadError'
import { Skeleton, SkeletonGroup } from '@/shared/Skeleton'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { Calendar } from '@/ui/Calendar'
import { Input } from '@/ui/Input'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 근무 가능 시간: 날짜를 누를 때마다 가능 → 불가 → 비움
// 색은 토큰만 (docs/08 4): 비움 = 흰 칸 + 옅은 테두리 · 가능 = 옅은 매장 색 · 불가 = destructive-soft
const MARK_STYLE = {
  0: 'border border-line/60 bg-white text-foreground',
  1: 'bg-brand-soft text-brand',
  2: 'bg-destructive-soft text-destructive-foreground',
} as const
const MARK_LABEL = { 0: '비움', 1: '가능', 2: '불가' } as const

/** 서버 제출 내용 → 달력 칸 (날짜(일) → 1 가능 · 2 불가) */
function toDraft(saved: MyAvailability): AvailabilityDraft {
  const marks: Record<number, AvailabilityMark> = {}
  for (const { date, status } of saved.days) {
    marks[Number(date.split('-')[2])] = status === 'available' ? 1 : 2
  }
  return { marks, memo: saved.memo }
}

/** 달력 칸 → 제출 모양 (비움은 빼고) */
function toDays(month: string, marks: Record<number, AvailabilityMark>): AvailabilityDay[] {
  return Object.entries(marks)
    .filter(([, mark]) => mark !== 0)
    .map(([day, mark]) => ({
      date: `${month}-${day.padStart(2, '0')}`,
      status: mark === 1 ? 'available' : 'unavailable',
    }))
}

// 제출 전에 칠한 내용은 매장별로 staffStore 에 남겨 둔다 (시트를 닫았다 열어도 그대로)
export function AvailabilitySheet({ onClose }: { onClose: () => void }) {
  const { store } = useCurrentStore()
  const availabilityQuery = useMyAvailability(store.id)
  const submitAvailability = useSubmitAvailability(store.id)
  const savedDraft = useStaffStore((state) => state.availabilityDrafts[store.id])
  const setDraft = useStaffStore((state) => state.setAvailabilityDraft)
  const clearDraft = useStaffStore((state) => state.clearAvailabilityDraft)

  const saved = availabilityQuery.data
  if (!saved) {
    return (
      <BottomSheet open onClose={onClose} label="근무 가능 시간">
        {availabilityQuery.isError ? (
          <LoadError
            what="가능 시간을"
            error={availabilityQuery.error}
            onRetry={() => availabilityQuery.refetch()}
          />
        ) : (
          <SkeletonGroup label="가능 시간을 불러오는 중" className="flex flex-col gap-4">
            <Skeleton shape="line" className="h-6 w-40" />
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }, (_, i) => (
                <Skeleton key={i} shape="circle" className="aspect-square w-full" />
              ))}
            </div>
          </SkeletonGroup>
        )}
      </BottomSheet>
    )
  }

  const draft = savedDraft ?? toDraft(saved)
  const availability = draft.marks
  const memo = draft.memo
  const [year, month] = saved.month.split('-').map(Number)
  const availabilityMonth = { year, month }
  const cycle = (day: number) =>
    setDraft(store.id, {
      ...draft,
      marks: { ...availability, [day]: (((availability[day] ?? 0) + 1) % 3) as AvailabilityMark },
    })
  const setMemo = (next: string) => setDraft(store.id, { ...draft, memo: next })

  const submit = () =>
    submitAvailability.mutate(
      { saved, days: toDays(saved.month, availability), memo },
      {
        onSuccess: () => {
          clearDraft(store.id)
          onClose()
          toast('제출했어요')
        },
        onError: (error) => {
          // 마감 · 이미 냄(409) · 알바생만 가능(403)은 다시 해도 같다 → BE 문장만 (409 는 훅이 서버 내용을 다시 불러옴)
          if (error instanceof ApiError && (error.status === 409 || error.status === 403)) {
            toast.error(errorMessage(error, '제출하지 못했어요'))
            return
          }
          toastApiError(error, '제출하지 못했어요. 다시 시도해 주세요', submit)
        },
      },
    )

  const marks = Object.values(availability)
  const okCount = marks.filter((v) => v === 1).length
  const noCount = marks.filter((v) => v === 2).length

  return (
    <BottomSheet open onClose={onClose} label={`${availabilityMonth.month}월 가능 시간`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[26px] leading-[1.25] font-extrabold tracking-[-0.03em]">
            {availabilityMonth.month}월 가능 시간
          </h2>
          <span className="text-[13px] leading-[1.45] font-medium text-muted-foreground">
            날짜를 누를 때마다 가능 → 불가 → 비움으로 바뀌어요
          </span>
        </div>

        <Calendar
          year={availabilityMonth.year}
          month={availabilityMonth.month}
          className="gap-1"
          renderDay={(day) => {
            const mark = availability[day] ?? 0
            return (
              <button
                type="button"
                onClick={() => cycle(day)}
                aria-label={`${availabilityMonth.month}월 ${day}일 ${MARK_LABEL[mark]}`}
                className={cn(
                  'aspect-square w-full rounded-full p-0 text-sm font-bold',
                  MARK_STYLE[mark],
                )}
              >
                {day}
              </button>
            )
          }}
        />

        <div className="flex gap-4 text-xs font-medium text-muted-foreground tabular-nums">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-brand-soft" />
            가능 {okCount}일
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-destructive-soft" />
            불가 {noCount}일
          </span>
        </div>

        <Input
          maxLength={AVAILABILITY_MEMO_MAX}
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="메모 · 희망 횟수"
          aria-label="메모 · 희망 횟수"
        />
        <Button disabled={submitAvailability.isPending} onClick={submit}>
          제출하기
        </Button>
      </div>
    </BottomSheet>
  )
}
