import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { IconButton } from '@/ui/IconButton'
import { cn } from '@/ui/utils'

// 아래에서 올라오는 시트 (Modal) — 담당: 나현. 사장님 데스크톱(.owner-wide 안 · lg)에서는 가운데 대화창. 바깥 · Esc · (closeButton 이면) 오른쪽 위 X 로 닫힌다.
interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** 스크린 리더용 제목 */
  label: string
  /** 오른쪽 위 닫기(X) 버튼 */
  closeButton?: boolean
  className?: string
}

export function BottomSheet({
  open,
  onClose,
  children,
  label,
  closeButton,
  className,
}: BottomSheetProps) {
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
      className={cn(
        'fixed inset-0 z-40 flex items-end justify-center bg-[rgba(20,28,22,0.45)] backdrop-blur-[2px] animate-in fade-in-0',
        // 사장님 데스크톱(.owner-wide · lg): 아래 시트 대신 가운데 대화창
        'lg:in-[.owner-wide]:items-center lg:in-[.owner-wide]:p-8 lg:in-[.owner-wide]:pl-[calc(256px+32px)]',
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'relative flex max-h-[88vh] w-full max-w-[460px] flex-col gap-[18px] overflow-y-auto rounded-t-[30px] bg-card px-5 pt-6 pb-8 animate-in slide-in-from-bottom-10',
          'lg:in-[.owner-wide]:max-w-[540px] lg:in-[.owner-wide]:rounded-[30px] lg:in-[.owner-wide]:px-7 lg:in-[.owner-wide]:pt-7 lg:in-[.owner-wide]:pb-7 lg:in-[.owner-wide]:shadow-float lg:in-[.owner-wide]:slide-in-from-bottom-4',
          className,
        )}
      >
        <div className="-mt-2.5 h-1 w-10 shrink-0 self-center rounded-sm bg-[#DDD6C9] lg:in-[.owner-wide]:hidden" />
        {closeButton && (
          <IconButton
            aria-label="닫기"
            variant="white"
            size="sm"
            onClick={onClose}
            className="absolute top-2.5 right-2.5 z-10 shadow-soft"
          >
            <X />
          </IconButton>
        )}
        {children}
      </div>
    </div>
  )
}
