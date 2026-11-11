import { ClipboardList, Package, Repeat, Umbrella } from 'lucide-react'
import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { toastApiError } from '@/lib/api/errors'
import {
  useDismissNotification,
  useNotifications,
  useReadHandoverNotifications,
} from '@/pages/owner/api/home'
import type { OwnerNotification } from '@/pages/owner/api/types'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { LoadError } from '@/shared/LoadError'
import { BottomSheet } from '@/ui/BottomSheet'
import { EmptyState } from '@/ui/EmptyState'
import { Spinner } from '@/ui/Spinner'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 상단 종: 모든 내 매장의 알림. 질문은 답하는 시트로, 대타 요청은 그 매장 근무 탭(수락 · 거절)으로 — 처리하면 사라진다
// 인수인계는 안 읽은 것만 보이고, 누르면(인수인계 화면으로) · 옆으로 밀면 그 매장 인수인계 알림을 읽음으로 → 사라진다
// (BE 는 매장 알림 전부 읽음만 있지만, 사장님 화면에서 BE 읽음을 쓰는 알림은 인수인계뿐이라 질문 · 대타는 그대로)
interface NotificationSheetProps {
  open: boolean
  onClose: () => void
  onOpenQuestion: (notification: OwnerNotification) => void
}

/** 옆으로 이만큼 밀면 지운다 (px) */
const SWIPE_DISMISS = 90

export function NotificationSheet({ open, onClose, onOpenQuestion }: NotificationSheetProps) {
  const query = useNotifications()
  const dismiss = useDismissNotification()
  const navigate = useNavigate()
  const { setCurrentStoreId } = useOwnerStore()
  const readHandovers = useReadHandoverNotifications()
  // 읽은 인수인계는 목록에서 뺀다
  const list = (query.data?.notifications ?? []).filter((n) => !(n.kind === 'handover' && n.isRead))
  const hasHandover = list.some((n) => n.kind === 'handover')

  const readStore = (storeId: string) =>
    readHandovers.mutate([storeId], {
      onError: (error) => toastApiError(error, '알림을 지우지 못했어요. 다시 시도해 주세요'),
    })

  const onClick = (n: OwnerNotification) => {
    if (n.kind === 'question') return onOpenQuestion(n)
    if (n.kind === 'substitute' || n.kind === 'handover') {
      if (n.kind === 'handover') readStore(n.storeId)
      setCurrentStoreId(n.storeId)
      onClose()
      return navigate(n.kind === 'substitute' ? '/owner/schedule' : '/owner/handover')
    }
    dismiss.mutate(n.notificationId, {
      onSuccess: () => toast('확인했어요'),
      onError: (error) => toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요'),
    })
  }

  return (
    <BottomSheet open={open} onClose={onClose} label="알림">
      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">알림</h2>
          {hasHandover && (
            <span className="text-xs text-subtle">인수인계는 옆으로 밀면 지워져요</span>
          )}
        </div>
        {query.isPending ? (
          <Spinner />
        ) : query.error ? (
          <LoadError error={query.error} onRetry={() => query.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState message="새 알림이 없어요" className="bg-white" />
        ) : (
          list.map((n) => {
            const Icon =
              n.kind === 'question'
                ? Umbrella
                : n.kind === 'substitute'
                  ? Repeat
                  : n.kind === 'handover'
                    ? ClipboardList
                    : Package
            const item = (
              <button
                type="button"
                onClick={() => onClick(n)}
                className="flex w-full items-center gap-3 rounded-[22px] bg-white px-4 py-3.5 text-left"
              >
                <span className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-accent text-[#2A4536]">
                  <Icon className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="text-xs font-bold text-muted-foreground">{n.storeName}</span>
                  <span className="text-[15px] font-bold">{n.title}</span>
                  <span className="text-xs text-subtle">{n.sub}</span>
                </span>
                <span
                  aria-label="새 알림"
                  className="size-2 shrink-0 rounded-full bg-destructive"
                />
              </button>
            )
            return n.kind === 'handover' ? (
              <SwipeToDismiss key={n.notificationId} onDismiss={() => readStore(n.storeId)}>
                {item}
              </SwipeToDismiss>
            ) : (
              <div key={n.notificationId}>{item}</div>
            )
          })
        )}
      </div>
    </BottomSheet>
  )
}

/** 옆으로 밀어 지우기: SWIPE_DISMISS 넘게 밀면 onDismiss, 아니면 제자리 (살짝 민 건 누르기로 본다) */
function SwipeToDismiss({ onDismiss, children }: { onDismiss: () => void; children: ReactNode }) {
  const start = useRef<number | null>(null)
  /** 이번 손가락이 밀었는지 (밀었으면 손 뗄 때의 클릭은 막는다) */
  const moved = useRef(false)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [gone, setGone] = useState(false)

  const down = (event: PointerEvent<HTMLDivElement>) => {
    start.current = event.clientX
    moved.current = false
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (start.current === null) return
    const next = event.clientX - start.current
    // 조금 움직인 건 누르기 (버튼 클릭이 막히지 않게)
    if (!moved.current && Math.abs(next) < 8) return
    moved.current = true
    setDragging(true)
    setDx(next)
  }
  const up = () => {
    if (start.current === null) return
    start.current = null
    setDragging(false)
    if (Math.abs(dx) > SWIPE_DISMISS) {
      setGone(true)
      onDismiss()
    } else setDx(0)
  }

  return (
    <div
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onClickCapture={(event) => {
        if (moved.current) {
          event.stopPropagation()
          event.preventDefault()
          moved.current = false
        }
      }}
      className={cn(
        'touch-pan-y',
        !dragging && 'transition-[opacity,transform] duration-150',
        gone && 'opacity-0',
      )}
      style={{ transform: `translateX(${gone ? Math.sign(dx) * 400 : dx}px)` }}
    >
      {children}
    </div>
  )
}
