import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useScheduleWorkers, useShiftTemplates } from '@/pages/owner/api/fixedSchedule'
import { FixedScheduleCard } from '@/pages/owner/schedule/components/FixedScheduleCard'
import { ReceivedRequests } from '@/pages/owner/schedule/components/ReceivedRequests'
import { ShiftTemplatesCard } from '@/pages/owner/schedule/components/ShiftTemplatesCard'
import { WorkCalendar } from '@/pages/owner/schedule/components/WorkCalendar'
import { WorkHeader } from '@/pages/owner/schedule/components/WorkHeader'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { cn } from '@/ui/utils'

// 근무 · 스케줄 (11/10 회의: 추천 스케줄 대신 고정 근무 + 대타)
//   받은 대타 요청 → 근무 달력 → [근무 설정 ▾] 고정 근무표(사람마다 요일 × 타임) · 근무 타임(시간 · 인원)
// [근무 설정] 고정 근무표 · 근무 타임은 자주 안 바꿔서 접어 두고, 누르면 펼친다 (11/12)
export default function ScheduleDraftPage() {
  const { store, today } = useOwnerStore()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const workers = useScheduleWorkers(store.storeId).data
  const templates = useShiftTemplates(store.storeId).data
  const summary =
    workers && templates ? `직원 ${workers.length}명 · 근무 타임 ${templates.length}개` : ''

  return (
    <div className="flex flex-col gap-[22px]">
      <WorkHeader segment="schedule" />
      {/* 받은 대타 요청은 휴대폰에서는 달력 위, 데스크톱에서는 오른쪽 칸 (달력 7 : 3) */}
      <WorkCalendar
        key={store.storeId}
        storeId={store.storeId}
        today={today}
        closed={store}
        aside={<ReceivedRequests storeId={store.storeId} />}
      />
      <button
        type="button"
        onClick={() => setSettingsOpen((open) => !open)}
        aria-expanded={settingsOpen}
        className="flex items-center gap-3 rounded-[22px] bg-card px-[18px] py-4 text-left shadow-soft transition-transform active:scale-[0.99]"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-extrabold">근무 설정</span>
          <span className="text-[13px] text-muted-foreground">
            {summary || '매주 반복되는 근무 · 시간'}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'size-5 shrink-0 text-subtle transition-transform',
            settingsOpen && 'rotate-180',
          )}
        />
      </button>
      {settingsOpen && (
        <>
          <FixedScheduleCard storeId={store.storeId} closedWeekdays={store.closedWeekdays} />
          <ShiftTemplatesCard storeId={store.storeId} />
        </>
      )}
    </div>
  )
}
