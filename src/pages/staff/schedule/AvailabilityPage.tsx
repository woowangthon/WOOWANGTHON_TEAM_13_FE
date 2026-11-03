import { AvailabilitySheet } from '@/pages/staff/schedule/components/AvailabilitySheet'
import { ShiftView } from '@/pages/staff/schedule/components/ShiftView'
import { useCloseTo } from '@/pages/staff/useCloseTo'

// 근무 가능 시간 입력: 근무표 위에 달력 시트를 띄운다
export default function AvailabilityPage() {
  const close = useCloseTo('/staff/schedule')
  return (
    <>
      <ShiftView />
      <AvailabilitySheet onClose={close} />
    </>
  )
}
