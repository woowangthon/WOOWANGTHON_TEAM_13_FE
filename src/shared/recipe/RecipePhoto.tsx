import { useState, type ReactNode } from 'react'
import { cn } from '@/ui/utils'

// 공용 보기 부품: 레시피 메뉴 사진 자리 · RecipeGrid · RecipeCard 가 같이 사용 — 담당: 민지
// 사진(imageUrl)이 있으면 자리를 꽉 채워 보여 주고, 없거나 못 불러오면 fallback(카테고리 아이콘)을 보여 준다
export function RecipePhoto({
  imageUrl,
  fallback,
  className,
}: {
  imageUrl: string | null
  fallback: ReactNode
  className?: string
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  if (!imageUrl || failedUrl === imageUrl) return fallback
  return (
    <img
      src={imageUrl}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailedUrl(imageUrl)}
      className={cn('absolute inset-0 size-full object-cover', className)}
    />
  )
}
