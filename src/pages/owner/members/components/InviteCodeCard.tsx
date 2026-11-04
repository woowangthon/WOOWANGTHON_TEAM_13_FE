import { copyInviteCode, shareInviteByKakao } from '@/pages/owner/members/components/inviteShare'
import { Button } from '@/ui/Button'
import { Card } from '@/ui/Card'

// 초대코드 크게 보기 + [복사] [카톡 보내기]
export function InviteCodeCard({
  label,
  code,
  storeName,
  name,
}: {
  label: string
  code: string
  storeName: string
  name: string
}) {
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
        <Button
          variant="kakao"
          className="text-sm"
          onClick={() => shareInviteByKakao(storeName, name, code)}
        >
          카톡 보내기
        </Button>
      </div>
    </div>
  )
}
