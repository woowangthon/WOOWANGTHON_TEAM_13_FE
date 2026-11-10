import { AvailabilityBanner } from '@/pages/staff/schedule/components/AvailabilityBanner'
import { ScheduleMonth } from '@/pages/staff/schedule/components/ScheduleMonth'
import { WorkHeader } from '@/pages/staff/schedule/components/WorkHeader'

// 근무표 탭: 매장 전체 근무 달력 (모두가 같이 봄) + (가짜 모드만) 근무 가능 시간 제출
export default function MySchedulePage() {
  return (
    <div className="flex flex-col gap-4">
      <WorkHeader segment="shift" />
      <ScheduleMonth />
      <AvailabilityBanner />
    </div>
  )
}
