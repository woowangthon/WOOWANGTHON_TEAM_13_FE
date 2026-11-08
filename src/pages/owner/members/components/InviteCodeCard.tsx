import { errorMessage } from '@/lib/api/errors'
import { useInviteShareInfo } from '@/pages/owner/api/members'
import { copyInviteCode, shareInviteByKakao } from '@/pages/owner/members/components/inviteShare'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'
import { toast } from '@/ui/toastStore'

// 초대코드 크게 보기 + [복사] [카톡 보내기]
// 입장 전 코드(invitationId 있음)는 BE share-info 로 링크를 받고, 이미 쓰였거나 취소된 코드면 카톡을 막는다
export function InviteCodeCard({
  label,
  code,
  storeName,
  name,
  storeId = '',
  invitationId,
}: {
  label: string
  code: string
  storeName: string
  name: string
  storeId?: string
  invitationId?: string | null
}) {
  const share = useInviteShareInfo(storeId, invitationId)

  const sendKakao = () => {
    if (share.error) {
      toast.error(errorMessage(share.error, '공유할 수 없는 코드예요. 새 코드를 만들어 주세요'))
      return
    }
    shareInviteByKakao(storeName, name, share.data?.code ?? code, share.data?.deepLink)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Card variant="dark" className="items-center gap-2 rounded-[24px] p-[22px]">
        <span className="text-xs font-semibold opacity-75">{label}</span>
        <span className="font-mono text-[32px] font-bold tracking-[0.24em]">{code}</span>
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="soft" className="text-sm" onClick={() => copyInviteCode(code)}>
          복사
        </Button>
        <Button variant="kakao" className="text-sm" onClick={sendKakao}>
          카톡 보내기
        </Button>
      </div>
    </div>
  )
}
