import { useNavigate } from 'react-router'
import { Tabs } from '@/ui/Tabs'

// 근무 탭 위쪽: 스케줄 / 급여 (11/12 — 매장 이름은 위쪽 매장 바꾸기와 겹치고 화면이 길어서 제목 · 매장 이름을 뺐다)
export function WorkHeader({ segment }: { segment: 'schedule' | 'pay' }) {
  const navigate = useNavigate()
  return (
    <div className="flex justify-end px-1">
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
