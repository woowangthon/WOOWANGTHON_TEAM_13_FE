import { useEffect, type ReactNode } from 'react'
import { cn } from '@/ui/utils'

// 아래에서 올라오는 시트 (Modal) — 담당: 나현. 바깥을 누르거나 Esc 를 누르면 닫힌다.
interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** 스크린 리더용 제목 */
  label: string
  className?: string
}

export function BottomSheet({ open, onClose, children, label, className }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-end justify-center bg-[rgba(20,28,22,0.45)] backdrop-blur-[2px] animate-in fade-in-0"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'flex max-h-[88vh] w-full max-w-[460px] flex-col gap-[18px] overflow-y-auto rounded-t-[30px] bg-card px-5 pt-6 pb-8 animate-in slide-in-from-bottom-10',
          className,
        )}
      >
        <div className="-mt-2.5 h-1 w-10 shrink-0 self-center rounded-sm bg-[#DDD6C9]" />
        {children}
      </div>
    </div>
  )
}
