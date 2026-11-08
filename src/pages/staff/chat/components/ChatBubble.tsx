import { RotateCw, Sparkles } from 'lucide-react'
import type { ChatMessage } from '@/lib/api/types'
import { formatOwner } from '@/lib/format'
import { AskOwnerButton } from '@/pages/staff/chat/components/AskOwnerButton'
import { SourceCard } from '@/pages/staff/chat/components/SourceCard'
import { Button } from '@/ui/Button'

// 채팅 부품: 말풍선 (나 / AI / 사장님 / 안내) · 입력 중(TypingBubble) · 답을 못 받음(FailedAnswer)
interface ChatBubbleProps {
  message: ChatMessage
  ownerName: string
  onAskOwner: () => void
}

export function ChatBubble({ message, ownerName, onAskOwner }: ChatBubbleProps) {
  switch (message.sender) {
    case 'staff':
      return (
        <div className="max-w-[80%] self-end rounded-[22px_22px_6px_22px] bg-brand px-4 py-3 text-[15px] leading-normal text-white">
          {message.text}
        </div>
      )
    case 'ai':
      return (
        <div className="flex max-w-[88%] flex-col gap-2 self-start">
          <span className="flex items-center gap-[5px] text-xs font-bold text-muted-foreground">
            <Sparkles className="size-[15px] text-brand" fill="currentColor" />
            AI 사수
          </span>
          <div className="rounded-[6px_22px_22px_22px] bg-card px-4 py-3.5 text-[15px] leading-relaxed">
            {message.text}
          </div>
          {message.sources[0] && <SourceCard source={message.sources[0]} />}
          {message.canAskOwner && <AskOwnerButton onClick={onAskOwner} />}
        </div>
      )
    case 'owner':
      return (
        <div className="flex max-w-[88%] flex-col gap-1.5 self-start">
          <span className="text-xs font-bold text-warm-foreground">
            {formatOwner(ownerName)} 답변
          </span>
          <div className="rounded-[6px_22px_22px_22px] bg-warm px-4 py-3.5 text-[15px] leading-[1.65] text-[#3A2A1E]">
            {message.text}
          </div>
        </div>
      )
    case 'system':
      return (
        <div className="self-center rounded-full bg-muted px-[13px] py-[7px] text-xs text-[#6B7068]">
          {message.text}
        </div>
      )
  }
}

/** AI 가 답을 쓰는 중 (질문을 보내고 답을 기다리는 동안) */
export function TypingBubble() {
  return (
    <div
      aria-label="답변을 쓰고 있어요"
      className="self-start rounded-[6px_22px_22px_22px] bg-card px-[18px] py-3.5 text-lg tracking-[3px] text-muted-foreground [animation:blink_1s_infinite]"
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
      <div className="max-w-[80%] self-end rounded-[22px_22px_6px_22px] bg-brand/60 px-4 py-3 text-[15px] leading-normal text-white">
        {text}
      </div>
      <div
        role="alert"
        className="flex max-w-[88%] flex-col gap-2.5 self-start rounded-[6px_22px_22px_22px] bg-warm px-4 py-3.5 text-[15px] leading-relaxed break-keep text-warm-foreground"
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
