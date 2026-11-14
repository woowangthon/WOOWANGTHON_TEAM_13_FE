import { Navigate } from 'react-router'

// 예전 "필요 인원 · 제출 현황" 주소 (추천 스케줄은 11/10 회의로 없어짐) → 근무 탭으로
export default function StaffingPage() {
  return <Navigate to="/owner/schedule" replace />
}
