import { useNavigate } from 'react-router'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { Tabs } from '@/ui/Tabs'

// 근무 탭 위쪽: 제목(화면 제목 26px) + 근무표 / 예상 급여 전환 (레시피 · 매뉴얼 머리와 같은 모양)
export function WorkHeader({ segment }: { segment: 'shift' | 'pay' }) {
  const { store } = useCurrentStore()
  const navigate = useNavigate()
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-[13px] font-medium text-muted-foreground">{store.name}</span>
        <h1 className="m-0 text-[26px] leading-[1.25] font-extrabold tracking-[-0.03em]">근무</h1>
      </div>
      <Tabs
        options={[
          { value: 'shift', label: '근무표' },
          { value: 'pay', label: '예상 급여' },
        ]}
        value={segment}
        onChange={(next) => navigate(next === 'shift' ? '/staff/schedule' : '/staff/payroll')}
      />
    </div>
  )
}
