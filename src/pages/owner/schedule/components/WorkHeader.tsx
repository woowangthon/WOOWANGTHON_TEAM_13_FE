import { useNavigate } from 'react-router'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { Tabs } from '@/ui/Tabs'

// 근무 탭 위쪽: 제목 + 스케줄 / 급여
export function WorkHeader({ segment }: { segment: 'schedule' | 'pay' }) {
  const { store } = useOwnerStore()
  const navigate = useNavigate()
  return (
    <div className="flex items-end justify-between gap-2.5 px-1">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-muted-foreground">{store.name}</span>
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.03em]">근무</h1>
      </div>
      <Tabs
        options={[
          { value: 'schedule', label: '스케줄' },
          { value: 'pay', label: '급여' },
        ]}
        value={segment}
        onChange={(next) => navigate(next === 'schedule' ? '/owner/schedule' : '/owner/payroll')}
      />
    </div>
  )
}
