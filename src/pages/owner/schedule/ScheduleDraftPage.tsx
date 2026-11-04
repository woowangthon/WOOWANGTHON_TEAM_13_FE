import { ScheduleCalendar } from '@/pages/owner/schedule/components/ScheduleCalendar'
import { ScheduleDraftCard } from '@/pages/owner/schedule/components/ScheduleDraftCard'
import { WorkHeader } from '@/pages/owner/schedule/components/WorkHeader'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'

// 근무 · 스케줄: 매장 근무 달력(조정) + 가능 시간 제출 현황 + 추천 스케줄 · 확정
export default function ScheduleDraftPage() {
  const { store, today } = useOwnerStore()
  return (
    <div className="flex flex-col gap-4">
      <WorkHeader segment="schedule" />
      <ScheduleCalendar key={store.storeId} storeId={store.storeId} today={today} />
      <ScheduleDraftCard storeId={store.storeId} />
    </div>
  )
}
