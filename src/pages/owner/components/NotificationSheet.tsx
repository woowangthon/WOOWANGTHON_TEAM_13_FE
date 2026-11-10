import { Package, Repeat, Umbrella } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toastApiError } from '@/lib/api/errors'
import { useDismissNotification, useNotifications } from '@/pages/owner/api/home'
import type { OwnerNotification } from '@/pages/owner/api/types'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { LoadError } from '@/shared/LoadError'
import { BottomSheet } from '@/ui/BottomSheet'
import { EmptyState } from '@/ui/EmptyState'
import { Spinner } from '@/ui/Spinner'
import { toast } from '@/ui/toastStore'

// 상단 종: 모든 내 매장의 알림. 질문은 답하는 시트로, 대타 요청은 그 매장 근무 탭(수락 · 거절)으로, 재고 알림은 누르면 확인
interface NotificationSheetProps {
  open: boolean
  onClose: () => void
  onOpenQuestion: (notification: OwnerNotification) => void
}

export function NotificationSheet({ open, onClose, onOpenQuestion }: NotificationSheetProps) {
  const query = useNotifications()
  const dismiss = useDismissNotification()
  const navigate = useNavigate()
  const { setCurrentStoreId } = useOwnerStore()
  const list = query.data?.notifications ?? []

  const onClick = (n: OwnerNotification) => {
    if (n.kind === 'question') return onOpenQuestion(n)
    if (n.kind === 'substitute') {
      setCurrentStoreId(n.storeId)
      onClose()
      return navigate('/owner/schedule')
    }
    dismiss.mutate(n.notificationId, {
      onSuccess: () => toast('확인했어요'),
      onError: (error) => toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요'),
    })
  }

  return (
    <BottomSheet open={open} onClose={onClose} label="알림">
      <div className="flex flex-col gap-3">
        <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">알림</h2>
        {query.isPending ? (
          <Spinner />
        ) : query.error ? (
          <LoadError error={query.error} onRetry={() => query.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState message="새 알림이 없어요" className="bg-white" />
        ) : (
          list.map((n) => {
            const Icon =
              n.kind === 'question' ? Umbrella : n.kind === 'substitute' ? Repeat : Package
            return (
              <button
                key={n.notificationId}
                type="button"
                onClick={() => onClick(n)}
                className="flex items-center gap-3 rounded-[22px] bg-white px-4 py-3.5 text-left"
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
          })
        )}
      </div>
    </BottomSheet>
  )
}
