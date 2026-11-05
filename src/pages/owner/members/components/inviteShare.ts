import { env } from '@/lib/env'
import { loadKakao } from '@/lib/kakao'
import { toast } from '@/ui/toastStore'

// 초대코드 복사 · 카톡 보내기 (P1, docs/03 S4). 카톡이 안 되면 복사로 안내한다

/** 받은 사람이 누르면 코드가 채워진 입장 화면으로 (/staff/join?code=…) */
export function inviteLink(code: string) {
  return `${window.location.origin}/staff/join?code=${code}`
}

export async function copyInviteCode(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    toast('코드를 복사했어요')
  } catch {
    toast.error('복사하지 못했어요. 코드를 길게 눌러 복사해 주세요')
  }
}

export async function shareInviteByKakao(storeName: string, name: string, code: string) {
  if (!env.kakaoJsKey) {
    toast.error('카카오 공유 설정이 아직 없어요. 코드를 복사해서 보내 주세요')
    return
  }
  try {
    const kakao = await loadKakao()
    const link = inviteLink(code)
    kakao.Share.sendDefault({
      objectType: 'text',
      text: `${storeName}에서 ${name} 님을 초대했어요.\n초대코드: ${code}`,
      link: { mobileWebUrl: link, webUrl: link },
      buttonTitle: '바로 입장하기',
    })
  } catch {
    toast.error('카카오톡을 열지 못했어요. 코드를 복사해서 보내 주세요')
  }
}
