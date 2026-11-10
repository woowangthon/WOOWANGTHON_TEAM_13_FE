import { ArrowRight, Check } from 'lucide-react'
import { Link } from 'react-router'
import { availabilityEnabled, useMyAvailability } from '@/lib/api/schedule'
import { fromDateKey } from '@/lib/date'
import { formatDate } from '@/lib/format'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { cn } from '@/ui/utils'

// 근무 가능 시간 제출 배너 (근무표 아래). BE 에서 가능 시간 API 가 없어져서 진짜 모드에서는 보이지 않는다 (availabilityEnabled)
export function AvailabilityBanner() {
  const enabled = availabilityEnabled()
  const { store } = useCurrentStore()
  const availabilityQuery = useMyAvailability(store.id, enabled)
  const availability = availabilityQuery.data
  if (!enabled || !availability) return null

  const submitted = availability.submittedAt !== null
  const month = Number(availability.month.split('-')[1])
  return (
    <Link
      to="/staff/availability"
      preventScrollReset
      className={cn(
        'flex items-center justify-between gap-3 rounded-[28px] p-5 text-left',
        submitted ? 'bg-card text-foreground' : 'bg-ink texture text-white',
      )}
    >
      <span className="flex flex-col gap-[5px]">
        <span className="text-lg font-bold">
          {month}월 가능 시간{submitted ? ' · 제출 완료' : ' 제출'}
        </span>
        <span className="text-[13px] opacity-80">
          {submitted ? '확정 대기' : `${formatDate(fromDateKey(availability.deadline))} 마감`}
        </span>
      </span>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-foreground">
        {submitted ? <Check className="size-[22px]" /> : <ArrowRight className="size-[22px]" />}
      </span>
    </Link>
  )
}
