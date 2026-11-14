import { RotateCw } from 'lucide-react'
import type { ChatMessage } from '@/lib/api/types'
import { formatOwner } from '@/lib/format'
import { AskOwnerButton } from '@/pages/staff/chat/components/AskOwnerButton'
import { SourceCard } from '@/pages/staff/chat/components/SourceCard'
import { Button } from '@/ui/Button'

// 채팅 부품: 말풍선 (나 / AI / 사장님 / 안내) · 입력 중(TypingBubble) · 답을 못 받음(FailedAnswer)
// 모서리 20 · 보낸 쪽 꼬리 6 (docs/08 3 채팅 예외). 나 = 매장 색 · AI = 옅은 바탕(흰 화면 위 구분) · 사장님 = 살구(warm) + 이름
// 출처 · [사장님께 물어보기]는 AI 말풍선 바로 아래 작게 (8px)

/** 말풍선 모양: 받은 쪽(왼쪽 위 꼬리) · 보낸 쪽(오른쪽 아래 꼬리) */
const FROM_LEFT = 'rounded-[6px_20px_20px_20px]'
const FROM_ME = 'rounded-[20px_20px_6px_20px]'

interface ChatBubbleProps {
  message: ChatMessage
  ownerName: string
  onAskOwner: () => void
}

export function ChatBubble({ message, ownerName, onAskOwner }: ChatBubbleProps) {
  switch (message.sender) {
    case 'staff':
      return (
        <div
          className={`max-w-[80%] self-end ${FROM_ME} bg-brand px-4 py-3 text-[15px] leading-[1.55] break-keep text-white`}
        >
          {message.text}
        </div>
      )
    case 'ai':
      return (
        <div className="flex max-w-[88%] flex-col gap-1 self-start">
          <span className="px-1 text-xs font-medium text-muted-foreground">AI 사수</span>
          <div
            className={`${FROM_LEFT} bg-secondary px-4 py-3 text-[15px] leading-[1.55] break-keep`}
          >
            {message.text}
          </div>
          {(message.sources[0] || message.canAskOwner) && (
            <div className="mt-1 flex flex-wrap gap-2">
              {message.sources[0] && <SourceCard source={message.sources[0]} />}
              {message.canAskOwner && <AskOwnerButton onClick={onAskOwner} />}
            </div>
          )}
        </div>
      )
    case 'owner':
      return (
        // data-owner-answer: 알림에서 오면 채팅 화면이 이 말풍선 위치로 스크롤한다
        <div data-owner-answer className="flex max-w-[88%] flex-col gap-1 self-start">
          <span className="px-1 text-xs font-bold text-warm-foreground">
            {formatOwner(ownerName)} 답변
          </span>
          <div
            className={`${FROM_LEFT} bg-warm px-4 py-3 text-[15px] leading-[1.55] break-keep text-foreground`}
          >
            {message.text}
          </div>
        </div>
      )
    case 'system':
      return (
        <div className="self-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {message.text}
        </div>
      )
  }
}

/** AI 가 답을 쓰는 중 (질문을 보내고 답을 기다리는 동안). 움직임 줄이기면 깜빡이지 않는다 */
export function TypingBubble() {
  return (
    <div
      role="status"
      aria-label="답변을 쓰고 있어요"
      className={`self-start ${FROM_LEFT} bg-secondary px-5 py-3 text-base leading-[1.55] tracking-widest text-muted-foreground motion-safe:animate-pulse`}
    >
      ···
    </div>
  )
}

/** 답을 못 받았을 때: 보낸 질문(흐리게) + 이유 + 다시 시도. BE 는 실패한 질문을 저장하지 않는다 */
export function FailedAnswer({
  text,
  reason,
  onRetry,
}: {
  text: string
  reason: string
  onRetry: () => void
}) {
  return (
    <>
      <div
        className={`max-w-[80%] self-end ${FROM_ME} bg-brand/60 px-4 py-3 text-[15px] leading-[1.55] break-keep text-white`}
      >
        {text}
      </div>
      <div
        role="alert"
        className={`flex max-w-[88%] flex-col gap-3 self-start ${FROM_LEFT} bg-warm px-4 py-3 text-[15px] leading-[1.55] break-keep text-warm-foreground`}
      >
        <span>{reason}</span>
        <Button variant="white" size="sm" className="self-start" onClick={onRetry}>
          <RotateCw className="size-4" />
          다시 시도
        </Button>
      </div>
    </>
  )
}
