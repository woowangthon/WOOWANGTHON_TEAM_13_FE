import { Check, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { availabilityEnabled, useMyAvailability } from '@/lib/api/schedule'
import { fromDateKey } from '@/lib/date'
import { formatDate } from '@/lib/format'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { PRESSABLE } from '@/shared/pressable'
import { cn } from '@/ui/utils'

// 근무 가능 시간 제출 배너 (근무표 아래). BE 에서 가능 시간 API 가 없어져서 진짜 모드에서는 보이지 않는다 (availabilityEnabled)
// 옅은 카드 + 옅은 테두리 (진한 먹색 덩어리 · 무늬 대신, docs/08 4). 제출 전이면 ›, 제출했으면 매장 색 ✓
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
        'flex items-center justify-between gap-3 rounded-3xl border border-line/60 bg-card px-5 py-4 text-left text-foreground',
        PRESSABLE,
      )}
    >
      <span className="flex flex-col gap-1">
        <span className="text-base leading-[1.4] font-bold">
          {month}월 가능 시간{submitted ? ' · 제출 완료' : ' 제출'}
        </span>
        <span className="text-[13px] font-medium text-muted-foreground tabular-nums">
          {submitted ? '확정 대기' : `${formatDate(fromDateKey(availability.deadline))} 마감`}
        </span>
      </span>
      {submitted ? (
        <Check aria-hidden="true" className="size-5 shrink-0 text-brand" />
      ) : (
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      )}
    </Link>
  )
}
