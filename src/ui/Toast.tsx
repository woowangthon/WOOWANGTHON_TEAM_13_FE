import { useToastStore } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 토스트 표시 자리 — 담당: 나현. 띄우는 함수는 src/ui/toastStore.ts 의 toast()
/** bottom: 하단 탭 위로 띄울 높이(px) */
export function Toaster({ bottom = 108 }: { bottom?: number }) {
  const current = useToastStore((state) => state.current)
  const hide = useToastStore((state) => state.hide)
  if (!current) return null

  return (
    <div
      key={current.id}
      role="status"
      style={{ bottom }}
      className={cn(
        'fixed left-1/2 z-[60] flex max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-full px-[22px] py-3.5 text-center text-sm font-semibold text-white animate-in fade-in-0 slide-in-from-bottom-2',
        current.tone === 'error' ? 'bg-destructive' : 'bg-ink',
      )}
    >
      <span>{current.message}</span>
      {current.onRetry && (
        <button
          type="button"
          onClick={() => {
            hide()
            current.onRetry?.()
          }}
          className="shrink-0 font-extrabold underline underline-offset-2"
        >
          다시 시도
        </button>
      )}
    </div>
  )
}
