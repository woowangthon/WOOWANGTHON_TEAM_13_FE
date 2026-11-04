import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useAskOwner, useAssistantChat, useSendMessage } from '@/lib/api/assistantChat'
import { ChatBubble, TypingBubble } from '@/pages/staff/chat/components/ChatBubble'
import { ChatInput } from '@/pages/staff/chat/components/ChatInput'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { Card } from '@/ui/Card'
import { Spinner } from '@/ui/Spinner'

// ⭐ AI 사수 채팅: 지금 매장의 매뉴얼 · 레시피만 근거로 답하고 출처를 보여 준다
// 매장마다 채팅방 1개 (없으면 자동으로 만든다). 근거가 없으면 사장님께 물어보기
export default function ChatPage() {
  const { store } = useCurrentStore()
  const location = useLocation()
  const chat = useAssistantChat(store.id)
  const send = useSendMessage(store.id, chat.chatId)
  const askOwner = useAskOwner(store.id, chat.chatId)
  // 레시피 시트의 'AI 사수에게 묻기'에서 오면 입력창에 메뉴 이름을 미리 넣는다
  const [draft, setDraft] = useState(
    () => (location.state as { draft?: string } | null)?.draft ?? '',
  )

  // 메시지가 바뀌거나 답을 기다리기 시작하면(입력 중 ···) 맨 아래로
  const first = useRef(true)
  useEffect(() => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: first.current ? 'auto' : 'smooth',
    })
    first.current = false
  }, [chat.messages, send.isPending])

  const submit = (text: string) => {
    const question = text.trim()
    if (!question || !chat.chatId) return
    send.mutate(question)
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-3.5 pb-[90px]">
      <Card variant="dark" className="flex-row items-center gap-3.5 p-5">
        <span className="flex size-[50px] shrink-0 items-center justify-center rounded-full bg-white/15">
          <Sparkles className="size-6" fill="currentColor" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[21px] font-bold">AI 사수</h1>
          <span className="text-xs leading-normal opacity-80">
            {store.name} 매뉴얼 기준으로 답해요
          </span>
        </div>
      </Card>

      {chat.isPending ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-3.5" aria-live="polite">
          {chat.messages?.map((message) => (
            <ChatBubble
              key={message.messageId}
              message={message}
              ownerName={store.ownerName}
              onAskOwner={() => askOwner.mutate(message.messageId)}
            />
          ))}
          {send.isPending && <TypingBubble />}
        </div>
      )}

      <ChatInput value={draft} onChange={setDraft} onSend={submit} chips={chat.suggestions} />
    </div>
  )
}
