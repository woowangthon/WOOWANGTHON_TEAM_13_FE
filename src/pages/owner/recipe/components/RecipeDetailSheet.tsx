import { useState } from 'react'
import { toastApiError } from '@/lib/api/errors'
import type { Recipe } from '@/lib/api/types'
import { useDeleteRecipe, useRecipePhotos } from '@/pages/owner/api/content'
import { RecipeCard } from '@/shared/recipe/RecipeCard'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toastStore'

// 레시피 상세 (사장님): 메뉴 사진 + 카드(shared/recipe/RecipeCard) + 삭제 · 수정
interface RecipeDetailSheetProps {
  storeId: string
  storeName: string
  recipe: Recipe
  onClose: () => void
  onEdit: () => void
  /** 삭제 뒤 (목록으로) */
  onGone: () => void
}

export function RecipeDetailSheet({
  storeId,
  storeName,
  recipe,
  onClose,
  onEdit,
  onGone,
}: RecipeDetailSheetProps) {
  const [askDelete, setAskDelete] = useState(false)
  const remove = useDeleteRecipe(storeId)
  const photo = useRecipePhotos(storeId).data?.[recipe.recipeId] ?? null

  const doDelete = () =>
    remove.mutate(recipe.recipeId, {
      onSuccess: () => {
        toast('삭제했어요')
        onGone()
      },
      onError: (error) => toastApiError(error, '삭제하지 못했어요. 다시 시도해 주세요'),
    })

  return (
    <BottomSheet open onClose={onClose} label={recipe.name} closeButton>
      {photo && (
        <img
          src={photo}
          alt={`${recipe.name} 사진`}
          className="mb-3 aspect-[4/3] w-full rounded-[24px] object-cover"
        />
      )}
      <RecipeCard
        recipe={recipe}
        storeName={storeName}
        footer={
          <div className="flex flex-col gap-2.5">
            {askDelete && (
              <div className="flex flex-col gap-2.5 rounded-[18px] bg-destructive-soft p-3.5">
                <span className="text-sm text-[#7E352C]">
                  알바생 화면과 AI 사수 답변에서도 사라져요.
                </span>
                <Button
                  variant="danger"
                  size="md"
                  className="h-[46px]"
                  disabled={remove.isPending}
                  onClick={doDelete}
                >
                  삭제
                </Button>
              </div>
            )}
            <div className="grid grid-cols-[1fr_1.4fr] gap-2">
              <Button
                variant="soft"
                className="h-[50px] text-sm text-destructive-foreground"
                onClick={() => setAskDelete(true)}
              >
                삭제
              </Button>
              <Button className="h-[50px] text-sm" onClick={onEdit}>
                수정
              </Button>
            </div>
          </div>
        }
      />
    </BottomSheet>
  )
}
