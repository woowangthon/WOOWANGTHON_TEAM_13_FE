import { availabilityMonth } from '@/api/mocks/staff/schedule'
import { useStaffStore } from '@/pages/staff/staffStore'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { Calendar } from '@/ui/Calendar'
import { Input } from '@/ui/Input'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 근무 가능 시간: 날짜를 누를 때마다 가능 → 불가 → 비움
const MARK_STYLE = {
  0: 'bg-white text-[#1C2420]',
  1: 'bg-[#D5E0D2] text-[#2A4536]',
  2: 'bg-[#F2DAD3] text-[#C0463F]',
} as const
const MARK_LABEL = { 0: '비움', 1: '가능', 2: '불가' } as const

export function AvailabilitySheet({ onClose }: { onClose: () => void }) {
  const availability = useStaffStore((state) => state.availability)
  const memo = useStaffStore((state) => state.availabilityMemo)
  const cycle = useStaffStore((state) => state.cycleAvailability)
  const setMemo = useStaffStore((state) => state.setAvailabilityMemo)
  const submit = useStaffStore((state) => state.submitAvailability)

  const marks = Object.values(availability)
  const okCount = marks.filter((v) => v === 1).length
  const noCount = marks.filter((v) => v === 2).length

  return (
    <BottomSheet open onClose={onClose} label={`${availabilityMonth.month}월 가능 시간`}>
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">
            {availabilityMonth.month}월 가능 시간
          </h2>
          <span className="text-[13px] text-muted-foreground">탭: 가능 · 불가 · 비움</span>
        </div>

        <Calendar
          year={availabilityMonth.year}
          month={availabilityMonth.month}
          className="gap-[5px]"
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

        <div className="flex gap-3.5 text-xs text-[#6B7068]">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-[#D5E0D2]" />
            가능 {okCount}일
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-[#F2DAD3]" />
            불가 {noCount}일
          </span>
        </div>

        <Input
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="메모 · 희망 횟수"
          aria-label="메모 · 희망 횟수"
        />
        <Button
          className="h-[54px]"
          onClick={() => {
            submit()
            onClose()
            toast('제출했어요')
          }}
        >
          제출하기
        </Button>
      </div>
    </BottomSheet>
  )
}
