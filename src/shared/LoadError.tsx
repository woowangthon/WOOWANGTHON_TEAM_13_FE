import { RotateCw } from 'lucide-react'
import { ERROR_MESSAGE, errorMessage } from '@/lib/api/errors'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'

// 공용 보기 부품: 불러오기 실패 자리 · 사장/알바 화면이 함께 사용 — 담당: 민지
// 실패했을 때 목록 자리에 "검색 결과 없음" 같은 빈 화면 대신 이걸 보여 준다 (토스트가 사라져도 남는다)
// 문구: 서버에 닿지 못하면 "서버에 연결하지 못했어요…", 그 밖에는 "불러오지 못했어요…"
export function LoadError({
  error,
  onRetry,
  className,
}: {
  error: unknown
  onRetry: () => void
  className?: string
}) {
  return (
    <EmptyState
      className={className}
      message={errorMessage(error, ERROR_MESSAGE.load)}
      action={
        <Button size="md" className="h-[46px] px-5" onClick={onRetry}>
          <RotateCw />
          다시 시도
        </Button>
      }
    />
  )
}
