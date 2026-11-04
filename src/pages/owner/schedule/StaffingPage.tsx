import { ScheduleDraftCard } from '@/pages/owner/schedule/components/ScheduleDraftCard'
import { WorkHeader } from '@/pages/owner/schedule/components/WorkHeader'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'

// 필요 인원 · 제출 현황 (P1): 다음 달 가능 시간 제출 현황 + 추천 스케줄만 따로 본다
export default function StaffingPage() {
  const { store } = useOwnerStore()
  return (
    <div className="flex flex-col gap-4">
      <WorkHeader segment="schedule" />
      <ScheduleDraftCard storeId={store.storeId} />
    </div>
  )
}
