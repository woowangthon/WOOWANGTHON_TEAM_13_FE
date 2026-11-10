import { FixedScheduleCard } from '@/pages/owner/schedule/components/FixedScheduleCard'
import { ReceivedRequests } from '@/pages/owner/schedule/components/ReceivedRequests'
import { ShiftTemplatesCard } from '@/pages/owner/schedule/components/ShiftTemplatesCard'
import { WorkCalendar } from '@/pages/owner/schedule/components/WorkCalendar'
import { WorkHeader } from '@/pages/owner/schedule/components/WorkHeader'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'

// 근무 · 스케줄 (11/10 회의: 추천 스케줄 대신 고정 근무 + 대타)
//   받은 대타 요청 → 근무 달력 → 고정 근무표(사람마다 요일 × 타임) → 근무 타임(시간 · 인원)
export default function ScheduleDraftPage() {
  const { store, today } = useOwnerStore()
  return (
    <div className="flex flex-col gap-[22px]">
      <WorkHeader segment="schedule" />
      <ReceivedRequests storeId={store.storeId} />
      <WorkCalendar key={store.storeId} storeId={store.storeId} today={today} />
      <FixedScheduleCard storeId={store.storeId} />
      <ShiftTemplatesCard storeId={store.storeId} />
    </div>
  )
}
