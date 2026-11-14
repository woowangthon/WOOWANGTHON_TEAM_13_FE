import {
  ArrowLeftRight,
  Bell,
  CalendarClock,
  ClipboardList,
  MessageCircleReply,
  UserCheck,
  UserX,
} from 'lucide-react'
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
import { Skeleton, SkeletonGroup } from '@/shared/Skeleton'
import { Header } from '@/ui/Header'
import { Toaster } from '@/ui/Toast'

// 알림: 최신 순 (대타 요청 · 대타 구해짐 · 대타 거절 · 근무 변경 · 사장님 답변). 화면을 열면 전부 읽음(POST /read) → 헤더 뱃지 0.
// 이번에 열었을 때 안 읽었던 것은 점을 남겨 둔다 (읽음 처리 뒤에도 무엇이 새로 왔는지 보이게)
// 모양 (docs/08 챕터 6): 카드 한 장 안에 줄 + 구분선. 종류 아이콘은 동그라미 없이 옅게, 새 알림 표시는 제목 옆 작은 빨간 점 하나만

const ICON: Record<string, typeof Bell> = {
  SUBSTITUTE_REQUESTED: ArrowLeftRight,
  SUBSTITUTE_ACCEPTED: UserCheck,
  SUBSTITUTE_REJECTED: UserX,
  DAILY_SCHEDULE_CHANGED: CalendarClock,
  OWNER_ANSWERED: MessageCircleReply,
  HANDOVER_CREATED: ClipboardList,
}

/**
 * 누르면 갈 곳: 대타 · 근무 변경 → 근무표 · 사장님 답변 → AI 사수 채팅(사장님 답변 위치로) · 그 외 → 홈.
 * 근무 변경(daily_schedule)의 target.id 는 날짜가 아니라 변경 기록 ID 라서 그날이 아닌 근무 탭으로 간다 (날짜는 본문에만)
 * 사장님 답변의 target.id 는 채팅방 ID 지만, 알바 채팅은 매장마다 방 1개(useAssistantChat 의 chats[0])라 /staff/chat 으로 가면 그 방이다
 */
const targetPath = (n: AppNotification) =>
  n.target.kind === 'substitute_request' || n.target.kind === 'daily_schedule'
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
        <NotificationsSkeleton />
      ) : notifications.length === 0 ? (
        <EmptyGuide
          message="아직 알림이 없어요"
          hint="대타 요청이나 사장님 답변이 오면 여기에 모여요"
        />
      ) : (
        <ul className="m-0 flex list-none flex-col overflow-hidden rounded-3xl border border-line/60 bg-card p-0">
          {notifications.map((n) => {
            const Icon = ICON[n.type] ?? Bell
            const isNew = newIds?.has(n.notificationId) ?? !n.isRead
            return (
              <li key={n.notificationId} className="border-b border-line/60 last:border-b-0">
                <button
                  type="button"
                  onClick={() => open(n)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left outline-none transition-colors duration-150 [-webkit-tap-highlight-color:transparent] active:bg-secondary focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-inset motion-reduce:transition-none"
                >
                  <Icon
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[15px] leading-[1.4] font-bold">{n.title}</span>
                      {isNew && (
                        <span
                          aria-label="새 알림"
                          className="size-1.5 shrink-0 rounded-full bg-destructive"
                        />
                      )}
                    </span>
                    <span className="text-[13px] leading-[1.45] font-medium text-balance break-keep text-muted-foreground">
                      {n.body}
                    </span>
                    <span className="text-xs font-medium text-subtle tabular-nums">
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

/** 알림 로딩 뼈대: 카드 한 장 안의 줄 4개 (아이콘 · 제목 · 본문 · 시간 자리) */
function NotificationsSkeleton() {
  return (
    <SkeletonGroup
      label="알림을 불러오는 중"
      className="flex flex-col overflow-hidden rounded-3xl border border-line/60 bg-card"
    >
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="flex gap-3 border-b border-line/60 px-4 py-3.5 last:border-b-0">
          <Skeleton className="size-5 rounded-full" />
          <span className="flex flex-1 flex-col gap-2">
            <Skeleton shape="line" className="h-4 w-1/2" />
            <Skeleton shape="line" className="w-5/6" />
            <Skeleton shape="line" className="w-16" />
          </span>
        </span>
      ))}
    </SkeletonGroup>
  )
}
