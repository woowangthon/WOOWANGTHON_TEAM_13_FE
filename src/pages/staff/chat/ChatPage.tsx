import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { ChatBubble } from '@/pages/staff/chat/components/ChatBubble'
import { ChatInput } from '@/pages/staff/chat/components/ChatInput'
import { useStaffStore } from '@/pages/staff/staffStore'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { Card } from '@/ui/Card'
import type { ChatMessage } from '@/api/mocks/staff/chat'

const NO_MESSAGES: ChatMessage[] = []

// ⭐ AI 사수 채팅: 지금 매장의 매뉴얼 · 레시피만 근거로 답하고 출처를 보여 준다
export default function ChatPage() {
  const { store } = useCurrentStore()
  const location = useLocation()
  const messages = useStaffStore((state) => state.chats[store.id] ?? NO_MESSAGES)
  const sendQuestion = useStaffStore((state) => state.sendQuestion)
  const askOwner = useStaffStore((state) => state.askOwner)
  // 레시피 시트의 'AI 사수에게 묻기'에서 오면 입력창에 메뉴 이름을 미리 넣는다
  const [draft, setDraft] = useState(
    () => (location.state as { draft?: string } | null)?.draft ?? '',
  )

  // 메시지가 바뀔 때마다 맨 아래로. 개수만 보면 '입력 중(···)'이 답변으로 바뀔 때(개수 그대로) 놓친다
  const first = useRef(true)
  useEffect(() => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: first.current ? 'auto' : 'smooth',
    })
    first.current = false
  }, [messages])

  const send = (text: string) => {
    if (!text.trim()) return
    sendQuestion(store.id, text)
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

      <div className="flex flex-col gap-3.5" aria-live="polite">
        {messages.map((message, i) => (
          <ChatBubble
            key={i}
            message={message}
            ownerName={store.ownerName}
            onAskOwner={() => askOwner(store.id)}
          />
        ))}
      </div>

      <ChatInput value={draft} onChange={setDraft} onSend={send} chips={store.chips} />
    </div>
  )
}
