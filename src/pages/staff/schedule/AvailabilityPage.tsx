import { Navigate } from 'react-router'
import { availabilityEnabled } from '@/lib/api/schedule'
import { useCloseTo } from '@/lib/useCloseTo'
import MySchedulePage from '@/pages/staff/schedule/MySchedulePage'
import { AvailabilitySheet } from '@/pages/staff/schedule/components/AvailabilitySheet'

// 근무 가능 시간 입력: 근무표 위에 달력 시트를 띄운다.
// BE 에서 가능 시간 API 가 없어져서(#31) 진짜 모드에서는 근무표로 돌려보낸다 (파일은 남겨 둠)
export default function AvailabilityPage() {
  const close = useCloseTo('/staff/schedule')
  if (!availabilityEnabled()) return <Navigate to="/staff/schedule" replace />
  return (
    <>
      <MySchedulePage />
      <AvailabilitySheet onClose={close} />
    </>
  )
}
