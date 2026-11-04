import { X } from 'lucide-react'
import { IconButton } from '@/ui/IconButton'

// 시트 오른쪽 위 닫기(X) — ui/BottomSheet 에 닫기 버튼이 생기기 전까지 쓰는 임시 부품 (나현에게 요청함)
// 시트 내용을 relative 로 감싼 안쪽에 둔다
export function SheetCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <IconButton
      aria-label="닫기"
      variant="white"
      size="sm"
      onClick={onClose}
      className="absolute top-2.5 right-2.5 z-10 shadow-soft"
    >
      <X />
    </IconButton>
  )
}
