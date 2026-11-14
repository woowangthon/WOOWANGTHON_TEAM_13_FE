import { Sparkles } from 'lucide-react'
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import { useAskOwner, useAssistantChat, useSendMessage } from '@/lib/api/assistantChat'
import { isNetworkError } from '@/lib/api/errors'
import { ApiError } from '@/lib/apiClient'
import { ChatBubble, FailedAnswer, TypingBubble } from '@/pages/staff/chat/components/ChatBubble'
import { ChatInput } from '@/pages/staff/chat/components/ChatInput'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { LoadError } from '@/shared/LoadError'
import { Skeleton, SkeletonGroup } from '@/shared/Skeleton'
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
  const [params] = useSearchParams()
  const chat = useAssistantChat(store.id)
  const send = useSendMessage(store.id, chat.chatId)
  const askOwner = useAskOwner(store.id, chat.chatId)
  // 레시피 시트의 'AI 사수에게 묻기'에서 오면 입력창에 메뉴 이름을 미리 넣는다
  const [draft, setDraft] = useState(
    () => (location.state as { draft?: string } | null)?.draft ?? '',
  )
  // 답을 못 받은 질문 (채팅 안에 안내 + 다시 시도)
  const [failed, setFailed] = useState<{ text: string; reason: string } | null>(null)

  // 조금이라도 스크롤하면 헤더를 작게 · 맨 위 가까이 올리면 이전 대화를 더 불러온다
  const [compact, setCompact] = useState(false)
  // 처음 맨 아래로 내려간 뒤에만 이전 대화 자동 불러오기 (열자마자 맨 위라서 불러오는 것을 막음)
  const scrolledToBottom = useRef(false)
  // 이전 대화를 붙이기 전 "맨 아래에서의 거리" — 붙인 뒤 같은 자리로 되돌린다 (화면이 튀지 않게)
  const keepFromBottom = useRef<number | null>(null)
  const { hasOlder, loadingOlder, loadOlder } = chat
  const loadOlderKeepingPlace = () => {
    if (!hasOlder || loadingOlder) return
    keepFromBottom.current = document.documentElement.scrollHeight - window.scrollY
    void loadOlder()
  }
  const onNearTop = useEffectEvent(loadOlderKeepingPlace)
  useEffect(() => {
    const onScroll = () => {
      setCompact(window.scrollY > 24)
      if (scrolledToBottom.current && window.scrollY < 120) onNearTop()
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 이전 대화가 앞에 붙으면 보던 자리 그대로 (그리기 전에 맞춘다)
  const firstId = chat.messages?.[0]?.messageId
  useLayoutEffect(() => {
    if (keepFromBottom.current === null || loadingOlder) return
    window.scrollTo({ top: document.documentElement.scrollHeight - keepFromBottom.current })
    keepFromBottom.current = null
  }, [firstId, loadingOlder])

  // 새 메시지가 끝에 붙거나 답을 기다리기 시작하면(입력 중 ···) 맨 아래로. 이전 대화가 앞에 붙을 때는 그대로
  // 알림("사장님이 답했어요")에서 왔으면 맨 아래 대신 마지막 사장님 답변 위치로 (질문을 보내면 다시 맨 아래 기준)
  const focusOwnerAnswer = useRef(
    (location.state as { focus?: string } | null)?.focus === 'owner-answer' ||
      params.get('focus') === 'owner-answer',
  )
  const lastId = chat.messages?.at(-1)?.messageId
  const first = useRef(true)
  useEffect(() => {
    if (lastId === undefined && !send.isPending && !failed) return
    if (send.isPending) focusOwnerAnswer.current = false
    const ownerAnswer = focusOwnerAnswer.current
      ? [...document.querySelectorAll('[data-owner-answer]')].at(-1)
      : undefined
    if (ownerAnswer) {
      ownerAnswer.scrollIntoView({ block: 'center', behavior: first.current ? 'auto' : 'smooth' })
    } else {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: first.current ? 'auto' : 'smooth',
      })
    }
    if (first.current) setTimeout(() => (scrolledToBottom.current = true), 300)
    first.current = false
  }, [lastId, send.isPending, failed])

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
    // flex-1: 화면 높이를 채워서, 대화가 없을 때 안내를 남는 공간의 세로 가운데에 둔다
    <div className="flex flex-1 flex-col gap-4 pb-[90px]">
      {/* 얇은 머리: 화면 이름 + 보조 한 줄. 위에 붙어 있고, 스크롤하면 한 줄로 줄어 대화 공간을 넓힌다.
          ✦ 는 "AI 가 답하는 화면" 표시로 여기 한 곳만 (말풍선마다 반복하지 않는다 — docs/08 7) */}
      <header
        className={cn(
          'sticky top-[calc(var(--offline-banner,0px)+max(14px,env(safe-area-inset-top))+52px)] z-10 -mx-4 flex bg-white px-5 transition-[padding] duration-200 motion-reduce:transition-none',
          compact
            ? 'items-center gap-2 border-b border-line/60 py-2.5'
            : 'flex-col gap-1 border-b border-transparent pt-1 pb-2',
        )}
      >
        <h1
          className={cn(
            'm-0 flex items-center gap-1.5 font-extrabold tracking-[-0.03em]',
            compact ? 'text-base leading-[1.4]' : 'text-[26px] leading-[1.25]',
          )}
        >
          <Sparkles
            aria-hidden="true"
            className={cn('shrink-0 text-brand', compact ? 'size-4' : 'size-5')}
            fill="currentColor"
          />
          AI 사수
        </h1>
        <span
          className={cn(
            'truncate text-[13px] font-medium text-muted-foreground',
            compact && 'ml-auto',
          )}
        >
          {compact ? `${store.name} 매뉴얼 기준` : `${store.name} 매뉴얼 기준으로 답해요`}
        </span>
      </header>

      {chat.isPending ? (
        <ChatSkeleton />
      ) : chat.isError ? (
        <LoadError what="대화를" error={chat.error} onRetry={chat.retry} />
      ) : (
        <div className="flex flex-1 flex-col gap-3" aria-live="polite">
          {/* 이전 대화: 불러오는 동안 작은 Spinner, 화면이 짧아 스크롤이 안 되면 버튼으로 */}
          {hasOlder &&
            (loadingOlder ? (
              <Spinner className="py-1" label="이전 대화를 불러오는 중" />
            ) : (
              <button
                type="button"
                onClick={loadOlderKeepingPlace}
                className="self-center rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                이전 대화 더 보기
              </button>
            ))}
          {chat.messages?.length === 0 && !send.isPending && !failed && (
            // 이 화면만의 빈 안내: 상자 없이 글자 두 줄 (보조 13px · 캡션 12px, 흰 바탕 대비 4.5 이상)
            <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center">
              <p className="m-0 text-[13px] leading-[1.45] font-medium text-muted-foreground">
                아직 나눈 대화가 없어요
              </p>
              <p className="m-0 text-xs leading-[1.4] font-medium text-balance break-keep text-subtle">
                궁금한 걸 아래에 적어 보세요. 매뉴얼에 없으면 사장님께 물어봐 드려요
              </p>
            </div>
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

// 첫 로딩 뼈대: AI · 나 · AI 말풍선 자리 (ChatBubble 과 같은 자리 · 모서리 20/6)
function ChatSkeleton() {
  return (
    <SkeletonGroup label="대화를 불러오는 중" className="flex flex-col gap-3">
      <Skeleton shape="line" className="mt-1 w-12" />
      <Skeleton className="h-12 w-56 rounded-[6px_20px_20px_20px]" />
      <Skeleton className="h-12 w-48 self-end rounded-[20px_20px_6px_20px]" />
      <Skeleton shape="line" className="mt-1 w-12" />
      <Skeleton className="h-20 w-64 rounded-[6px_20px_20px_20px]" />
      <Skeleton className="h-8 w-36 rounded-full" />
    </SkeletonGroup>
  )
}
