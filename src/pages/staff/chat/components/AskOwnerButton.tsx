import { Button } from '@/ui/Button'

// 채팅 부품: 사장님께 물어보기 (AI 가 근거를 찾지 못했을 때). AI 말풍선 바로 아래 작은 옅은 버튼 (주 버튼처럼 크지 않게 — docs/08)
export function AskOwnerButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="soft" size="sm" onClick={onClick}>
      사장님께 물어보기
    </Button>
  )
}
