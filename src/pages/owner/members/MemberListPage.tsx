import { InvitePanel, MemberBoard } from '@/pages/owner/members/components/MemberBoard'
import { useWide } from '@/pages/owner/useWide'

// 직원 목록 · 코드 상태. 데스크톱은 오른쪽 칸에 초대 폼이 기본으로 열려 있다
export default function MemberListPage() {
  const wide = useWide()
  return <MemberBoard panel={wide ? <InvitePanel /> : undefined} />
}
