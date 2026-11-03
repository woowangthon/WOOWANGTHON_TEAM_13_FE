import { HandoverWriteSheet } from '@/pages/staff/handover/components/HandoverWriteSheet'
import { StaffHome } from '@/pages/staff/home/components/StaffHome'
import { useCloseTo } from '@/pages/staff/useCloseTo'

// 인수인계 남기기: 홈 위에 작성 시트를 띄운다 (하단 + 버튼)
export default function HandoverPage() {
  const close = useCloseTo('/staff')
  return (
    <>
      <StaffHome />
      <HandoverWriteSheet onClose={close} />
    </>
  )
}
