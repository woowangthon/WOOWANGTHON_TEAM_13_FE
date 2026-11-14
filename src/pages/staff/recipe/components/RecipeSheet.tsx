import type { Recipe } from '@/lib/api/types'
import { RecipeCard } from '@/shared/recipe/RecipeCard'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'

// 레시피 상세 시트: 재료 · 양 표 + 만드는 순서 + 메모 (shared/recipe/RecipeCard clean) + AI 사수에게 묻기
// [AI 사수에게 묻기]는 읽기가 주 행동인 화면의 보조 행동이라 옅은(soft) 버튼 (docs/08)
interface RecipeSheetProps {
  recipe: Recipe
  /** 목록 내용으로 먼저 연 상태 (만드는 순서 · 메모를 받아 오는 중) */
  stepsPending?: boolean
  storeName: string
  onClose: () => void
  onAsk: () => void
}

export function RecipeSheet({ recipe, stepsPending, storeName, onClose, onAsk }: RecipeSheetProps) {
  return (
    <BottomSheet open onClose={onClose} label={recipe.name} closeButton>
      <RecipeCard
        variant="clean"
        recipe={recipe}
        stepsPending={stepsPending}
        storeName={storeName}
        footer={
          <Button variant="soft" onClick={onAsk}>
            AI 사수에게 묻기
          </Button>
        }
      />
    </BottomSheet>
  )
}
