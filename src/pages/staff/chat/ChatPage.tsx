import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useAskOwner, useAssistantChat, useSendMessage } from '@/lib/api/assistantChat'
import { isNetworkError } from '@/lib/api/errors'
import { ApiError } from '@/lib/apiClient'
import { ChatBubble, FailedAnswer, TypingBubble } from '@/pages/staff/chat/components/ChatBubble'
import { ChatInput } from '@/pages/staff/chat/components/ChatInput'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { EmptyGuide } from '@/shared/EmptyGuide'
import { LoadError } from '@/shared/LoadError'
import { Card } from '@/ui/Card'
import { Spinner } from '@/ui/Spinner'
import { cn } from '@/ui/utils'

/** 답을 못 받은 이유: AI 를 못 씀(503, 예: Gemini 키 없음) · 연결 끊김 · 그 밖 */
function failReason(error: unknown) {
  if (isNetworkError(error)) return '서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요'
  if (error instanceof ApiError && error.status === 503)
    return 'AI 답변을 지금 못 받아요. 잠시 뒤 다시 시도해 주세요'
  return '답변을 받지 못했어요. 다시 시도해 주세요'
}

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
  // 답을 못 받은 질문 (채팅 안에 안내 + 다시 시도)
  const [failed, setFailed] = useState<{ text: string; reason: string } | null>(null)

  // 메시지가 바뀌거나 답을 기다리기 시작하면(입력 중 ···) 맨 아래로
  // 조금이라도 스크롤하면 헤더를 작게
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const first = useRef(true)
  useEffect(() => {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: first.current ? 'auto' : 'smooth',
    })
    first.current = false
  }, [chat.messages, send.isPending, failed])

  const submit = (text: string) => {
    const question = text.trim()
    if (!question || !chat.chatId) return
    setFailed(null)
    send.mutate(question, {
      onError: (error) => setFailed({ text: question, reason: failReason(error) }),
    })
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-3.5 pb-[90px]">
      {/* 위에 붙어 있고, 스크롤하면 작아져서 대화 공간을 넓힌다 */}
      <Card
        variant="dark"
        className={cn(
          'sticky top-2 z-10 flex-row items-center transition-[padding,gap] duration-200',
          compact ? 'gap-2.5 px-4 py-2.5' : 'gap-3.5 p-5',
        )}
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-white/15 transition-[width,height] duration-200',
            compact ? 'size-[34px]' : 'size-[50px]',
          )}
        >
          <Sparkles className={compact ? 'size-[18px]' : 'size-6'} fill="currentColor" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className={cn('m-0 font-bold', compact ? 'text-[17px]' : 'text-[21px]')}>AI 사수</h1>
          {!compact && (
            <span className="text-xs leading-normal opacity-80">
              {store.name} 매뉴얼 기준으로 답해요
            </span>
          )}
        </div>
        {compact && (
          <span className="ml-auto truncate text-xs opacity-80">{store.name} 매뉴얼 기준</span>
        )}
      </Card>

      {chat.isPending ? (
        <Spinner />
      ) : chat.isError ? (
        <LoadError error={chat.error} onRetry={chat.retry} />
      ) : (
        <div className="flex flex-col gap-3.5" aria-live="polite">
          {chat.messages?.length === 0 && !send.isPending && !failed && (
            <EmptyGuide
              message="아직 나눈 대화가 없어요"
              hint="궁금한 걸 아래에 적어 보세요. 매뉴얼에 없으면 사장님께 물어봐 드려요"
            />
          )}
          {chat.messages?.map((message) => (
            <ChatBubble
              key={message.messageId}
              message={message}
              ownerName={store.ownerName}
              onAskOwner={() => askOwner.mutate(message.messageId)}
            />
          ))}
          {send.isPending && <TypingBubble />}
          {failed && !send.isPending && (
            <FailedAnswer
              text={failed.text}
              reason={failed.reason}
              onRetry={() => submit(failed.text)}
            />
          )}
        </div>
      )}

      <ChatInput value={draft} onChange={setDraft} onSend={submit} chips={chat.suggestions} />
    </div>
  )
}
