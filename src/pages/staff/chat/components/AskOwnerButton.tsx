import { Send } from 'lucide-react'
import { Button } from '@/ui/Button'

// 채팅 부품: 사장님께 물어보기 (AI 가 근거를 찾지 못했을 때)
export function AskOwnerButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ink" size="md" className="self-start" onClick={onClick}>
      <Send />
      사장님께 물어보기
    </Button>
  )
}
