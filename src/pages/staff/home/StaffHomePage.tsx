import { Navigate } from 'react-router'
import { hasSeenStaffGuide } from '@/pages/staff/guide/staffGuideSeen'
import { StaffHome } from '@/pages/staff/home/components/StaffHome'

export default function StaffHomePage() {
  // 알바 홈에 처음 들어왔고 앱 사용법을 아직 안 봤으면 한 번 보여 준다 (다 보면 다시 홈으로)
  if (!hasSeenStaffGuide()) return <Navigate to="/staff/guide" replace />
  return <StaffHome />
}
