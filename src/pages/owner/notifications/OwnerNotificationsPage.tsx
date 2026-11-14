import {
  ArrowLeftRight,
  Bell,
  ClipboardList,
  MessageCircleQuestion,
  Package,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toastApiError } from '@/lib/api/errors'
import { toDateKey } from '@/lib/date'
import { formatRelative } from '@/lib/format'
import { useCloseTo } from '@/lib/useCloseTo'
import {
  useDismissNotification,
  useNotifications,
  useReadHandoverNotifications,
} from '@/pages/owner/api/home'
import type { OwnerNotification } from '@/pages/owner/api/types'
import { OwnerFrame } from '@/pages/owner/components/OwnerFrame'
import {
  readOpenedHandovers,
  saveOpenedHandovers,
} from '@/pages/owner/notifications/openedHandovers'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { EmptyGuide } from '@/shared/EmptyGuide'
import { LoadError } from '@/shared/LoadError'
import { PRESSABLE_CARD } from '@/shared/pressable'
import { Header } from '@/ui/Header'
import { Spinner } from '@/ui/Spinner'
import { Toaster } from '@/ui/Toast'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 사장님 알림 (알바 알림 화면과 같은 모양): 모든 내 매장의 질문 · 받은 대타 요청 · 인수인계.
// 처리할 것(대타 · 질문) 먼저, 그다음 인수인계. 질문 · 대타는 처리할 때까지 늘 새 알림
// 화면을 열면 인수인계 알림을 전부 읽음(POST …/notifications/read) → 종 점이 꺼진다.
// 이번에 열었을 때 새로 온 것은 점을 남겨 둔다 (읽음 처리 뒤에도 무엇이 새로 왔는지 보이게)
// 인수인계 알림을 누르면 목록에서 빠지고, 그 알림이 온 날의 인수인계로 간다 (QA 11/15)

const ICON: Record<OwnerNotification['kind'], LucideIcon> = {
  question: MessageCircleQuestion,
  substitute: ArrowLeftRight,
  handover: ClipboardList,
  stock: Package,
}

const isNewNow = (n: OwnerNotification) => n.kind !== 'handover' || !n.isRead

export default function OwnerNotificationsPage() {
  const navigate = useNavigate()
  const close = useCloseTo('/owner')
  const { store, setCurrentStoreId } = useOwnerStore()
  const query = useNotifications()
  const readHandovers = useReadHandoverNotifications()
  const dismiss = useDismissNotification()
  /** 눌러서 본 인수인계 알림 (목록에서 뺀다) */
  const [opened, setOpened] = useState(readOpenedHandovers)
  const notifications = query.data?.notifications.filter(
    (n) => n.kind !== 'handover' || !opened.has(n.notificationId),
  )

  // 처음 받은 목록에서 새 알림을 기억하고, 안 읽은 인수인계가 있는 매장은 바로 읽음 처리
  const [newIds, setNewIds] = useState<Set<string> | null>(null)
  const marked = useRef(false)
  const { mutate: markRead } = readHandovers
  useEffect(() => {
    if (!notifications || marked.current) return
    marked.current = true
    setNewIds(new Set(notifications.filter(isNewNow).map((n) => n.notificationId)))
    const storeIds = [
      ...new Set(
        notifications.filter((n) => n.kind === 'handover' && !n.isRead).map((n) => n.storeId),
      ),
    ]
    // 실패해도 목록은 그대로 보이고, 다음에 열 때 다시 시도된다
    if (storeIds.length > 0) markRead(storeIds)
  }, [notifications, markRead])

  /** 누르면 갈 곳: 질문 → 그 매장 홈의 답하기 시트 · 대타 → 근무 탭(수락 · 거절) · 인수인계 → 그날 인수인계 화면 */
  const open = (n: OwnerNotification) => {
    if (n.kind === 'stock') {
      // 재고 알림(가짜 서버만): 누르면 확인 → 목록에서 빠진다
      return dismiss.mutate(n.notificationId, {
        onSuccess: () => toast('확인했어요'),
        onError: (error) => toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요'),
      })
    }
    setCurrentStoreId(n.storeId)
    if (n.kind === 'question') return navigate(`/owner?question=${n.questionId}`)
    if (n.kind === 'substitute') return navigate('/owner/schedule')
    const next = new Set(opened).add(n.notificationId)
    setOpened(next)
    saveOpenedHandovers(next)
    // BE 알림에는 인수인계 날짜가 없어서 알림이 온 날로 (인수인계는 그날 남긴다)
    navigate(
      n.createdAt ? `/owner/handover?date=${toDateKey(new Date(n.createdAt))}` : '/owner/handover',
    )
  }

  return (
    <OwnerFrame colors={store} narrow className="gap-4 pb-10">
      <Header title="알림" onBack={close} />

      {query.isError ? (
        <LoadError what="알림을" error={query.error} onRetry={() => query.refetch()} />
      ) : !notifications ? (
        <Spinner />
      ) : notifications.length === 0 ? (
        <EmptyGuide
          message="아직 알림이 없어요"
          hint="알바생 질문 · 대타 요청 · 인수인계가 오면 여기에 모여요"
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {notifications.map((n) => {
            const Icon = ICON[n.kind] ?? Bell
            const isNew = newIds?.has(n.notificationId) ?? isNewNow(n)
            // 시간 줄: 매장 이름 · 알림 시간 (11/14, 매장이 하나여도 매장 이름을 보여 준다)
            const meta = [n.storeName, n.createdAt && formatRelative(n.createdAt)]
              .filter(Boolean)
              .join(' · ')
            return (
              <li key={n.notificationId}>
                <button
                  type="button"
                  onClick={() => open(n)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-[20px] border border-line/60 bg-card px-4 py-3.5 text-left',
                    PRESSABLE_CARD,
                  )}
                >
                  {/* 아이콘은 알바 알림처럼 동그라미 없이 선 아이콘만 */}
                  <Icon
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="text-[15px] font-extrabold">{n.title}</span>
                      {isNew && (
                        <span aria-label="새 알림" className="size-2 rounded-full bg-destructive" />
                      )}
                    </span>
                    <span className="text-[15px] leading-snug text-balance break-keep text-foreground">
                      {n.sub}
                    </span>
                    {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <Toaster />
    </OwnerFrame>
  )
}
