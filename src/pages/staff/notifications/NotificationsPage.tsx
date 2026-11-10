import { ArrowLeftRight, Bell, ClipboardList, MessageCircleReply, UserCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { chatKeys } from '@/lib/api/assistantChat'
import { useNotifications, useReadNotifications } from '@/lib/api/notifications'
import type { AppNotification } from '@/lib/api/types'
import { formatRelative } from '@/lib/format'
import { useCloseTo } from '@/lib/useCloseTo'
import { StaffFrame } from '@/pages/staff/components/StaffFrame'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { EmptyGuide } from '@/shared/EmptyGuide'
import { LoadError } from '@/shared/LoadError'
import { PRESSABLE_CARD } from '@/shared/pressable'
import { Header } from '@/ui/Header'
import { Spinner } from '@/ui/Spinner'
import { Toaster } from '@/ui/Toast'
import { cn } from '@/ui/utils'

// 알림: 최신 순 (대타 요청 · 대타 구해짐 · 사장님 답변). 화면을 열면 전부 읽음(POST /read) → 헤더 뱃지 0.
// 이번에 열었을 때 안 읽었던 것은 점을 남겨 둔다 (읽음 처리 뒤에도 무엇이 새로 왔는지 보이게)

const ICON: Record<string, typeof Bell> = {
  SUBSTITUTE_REQUESTED: ArrowLeftRight,
  SUBSTITUTE_ACCEPTED: UserCheck,
  OWNER_ANSWERED: MessageCircleReply,
  HANDOVER_CREATED: ClipboardList,
}

/**
 * 누르면 갈 곳: 대타 → 근무표(받은 대타 카드) · 사장님 답변 → AI 사수 채팅(사장님 답변 위치로) · 그 외 → 홈.
 * 사장님 답변의 target.id 는 채팅방 ID 지만, 알바 채팅은 매장마다 방 1개(useAssistantChat 의 chats[0])라 /staff/chat 으로 가면 그 방이다
 */
const targetPath = (n: AppNotification) =>
  n.target.kind === 'substitute_request'
    ? '/staff/schedule'
    : n.target.kind === 'assistant_chat'
      ? '/staff/chat'
      : '/staff'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const close = useCloseTo('/staff')
  const { store } = useCurrentStore()
  const query = useNotifications(store.id)
  const read = useReadNotifications(store.id)
  const queryClient = useQueryClient()
  const open = (n: AppNotification) => {
    if (n.target.kind === 'assistant_chat') {
      // 사장님 답변이 바로 보이게 메시지를 새로 불러오고, 채팅 화면은 사장님 답변 위치로 스크롤한다
      void queryClient.invalidateQueries({ queryKey: chatKeys.list(store.id) })
      return navigate('/staff/chat', { state: { focus: 'owner-answer' } })
    }
    navigate(targetPath(n))
  }
  const notifications = query.data?.notifications

  // 처음 받은 목록에서 안 읽은 것을 기억하고, 바로 전부 읽음 처리
  const [newIds, setNewIds] = useState<Set<string> | null>(null)
  const markedFor = useRef<string | null>(null)
  const { mutate: markAllRead } = read
  useEffect(() => {
    if (!notifications || markedFor.current === store.id) return
    markedFor.current = store.id
    const unread = notifications.filter((n) => !n.isRead)
    setNewIds(new Set(unread.map((n) => n.notificationId)))
    if (unread.length > 0) markAllRead()
  }, [notifications, store.id, markAllRead])

  return (
    <StaffFrame store={store} className="gap-4">
      <Header title="알림" onBack={close} />

      {query.isError ? (
        <LoadError what="알림을" error={query.error} onRetry={() => query.refetch()} />
      ) : !notifications ? (
        <Spinner />
      ) : notifications.length === 0 ? (
        <EmptyGuide
          message="아직 알림이 없어요"
          hint="대타 요청이나 사장님 답변이 오면 여기에 모여요"
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {notifications.map((n) => {
            const Icon = ICON[n.type] ?? Bell
            const isNew = newIds?.has(n.notificationId) ?? !n.isRead
            return (
              <li key={n.notificationId}>
                <button
                  type="button"
                  onClick={() => open(n)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-[20px] bg-card px-4 py-3.5 text-left shadow-soft',
                    PRESSABLE_CARD,
                  )}
                >
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-full',
                      isNew ? 'bg-brand text-white' : 'bg-brand-soft text-brand',
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="text-[15px] font-extrabold">{n.title}</span>
                      {isNew && (
                        <span aria-label="새 알림" className="size-2 rounded-full bg-destructive" />
                      )}
                    </span>
                    <span className="text-sm leading-snug text-balance break-keep text-foreground">
                      {n.body}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelative(n.createdAt)}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Toaster />
    </StaffFrame>
  )
}
