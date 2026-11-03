import { Sparkles } from 'lucide-react'
import type { Recipe } from '@/api/mocks/staff/recipes'
import { RecipeCard } from '@/shared/recipe/RecipeCard'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'

// 레시피 상세 시트: 재료 · 양 표 + 만드는 순서 + 메모 (shared/recipe/RecipeCard) + AI 사수에게 묻기
interface RecipeSheetProps {
  recipe: Recipe
  storeName: string
  onClose: () => void
  onAsk: () => void
}

export function RecipeSheet({ recipe, storeName, onClose, onAsk }: RecipeSheetProps) {
  return (
    <BottomSheet open onClose={onClose} label={recipe.name}>
      <RecipeCard
        recipe={recipe}
        storeName={storeName}
        footer={
          <Button variant="ink" className="text-sm" onClick={onAsk}>
            <Sparkles />
            AI 사수에게 묻기
          </Button>
        }
      />
    </BottomSheet>
  )
}
