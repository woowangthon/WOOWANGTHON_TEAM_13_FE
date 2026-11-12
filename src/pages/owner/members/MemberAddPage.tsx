import { useNavigate } from 'react-router'
import { InviteForm } from '@/pages/owner/members/components/InviteForm'
import { InvitePanel, MemberBoard } from '@/pages/owner/members/components/MemberBoard'
import { useWide } from '@/pages/owner/useWide'
import { useCloseTo } from '@/pages/staff/useCloseTo'
import { BottomSheet } from '@/ui/BottomSheet'

// 알바생 추가 · 코드 발급 · 카톡 공유 (docs/03 S4)
// 휴대폰: 직원 목록 위 초대 시트 / 데스크톱: 직원 목록 오른쪽 칸에 초대 폼 (직원 탭 기본 화면과 같음)
export default function MemberAddPage() {
  const navigate = useNavigate()
  const close = useCloseTo('/owner/members')
  const wide = useWide()
  const done = () => navigate('/owner/members', { replace: true })

  if (wide) return <MemberBoard panel={<InvitePanel onDone={done} />} />

  return (
    <>
      <MemberBoard />
      <BottomSheet open onClose={close} label="알바생 초대" closeButton>
        <div className="flex flex-col gap-3.5">
          <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">알바생 초대</h2>
          <InviteForm onDone={done} />
        </div>
      </BottomSheet>
    </>
  )
}
