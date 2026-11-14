import { useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { isNotFound } from '@/lib/api/errors'
import { useRecipe } from '@/lib/api/recipes'
import { RecipeDetailSheet } from '@/pages/owner/recipe/components/RecipeDetailSheet'
import { RecipeFormSheet } from '@/pages/owner/recipe/components/RecipeFormSheet'
import { StoreInfoBoard } from '@/pages/owner/recipe/components/StoreInfoBoard'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { useCloseTo } from '@/pages/staff/useCloseTo'

// 레시피 작성 · 수정 · 삭제: 레시피 목록 위에 시트
//   /owner/recipes/new        → 추가 시트 (템플릿)
//   /owner/recipes/:recipeId  → 상세 시트 (삭제 · 수정 → 수정 시트)
export default function RecipeEditPage() {
  const { recipeId } = useParams()
  const { store } = useOwnerStore()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const close = useCloseTo(`/owner/recipes?${params.toString()}`)
  const toList = (category?: string) =>
    navigate(category ? `/owner/recipes?cat=${category}` : '/owner/recipes', { replace: true })

  return (
    <>
      <StoreInfoBoard segment="recipe" />
      {recipeId ? (
        <RecipeDetail
          key={recipeId}
          storeId={store.storeId}
          storeName={store.name}
          recipeId={recipeId}
          onClose={close}
          onDone={toList}
        />
      ) : (
        <RecipeFormSheet
          storeId={store.storeId}
          initialCategory={params.get('cat') ?? undefined}
          onClose={close}
          onSaved={(_, category) => toList(category)}
        />
      )}
    </>
  )
}

function RecipeDetail({
  storeId,
  storeName,
  recipeId,
  onClose,
  onDone,
}: {
  storeId: string
  storeName: string
  recipeId: string
  onClose: () => void
  onDone: (category?: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const query = useRecipe(storeId, recipeId)

  // 다른 매장 · 지운 레시피면 목록으로
  if (isNotFound(query.error)) return <Navigate to="/owner/recipes" replace />
  const recipe = query.data
  if (!recipe) return null

  return editing ? (
    <RecipeFormSheet
      storeId={storeId}
      recipe={recipe}
      onClose={() => setEditing(false)}
      onSaved={() => setEditing(false)}
    />
  ) : (
    <RecipeDetailSheet
      storeId={storeId}
      storeName={storeName}
      recipe={recipe}
      onClose={onClose}
      onEdit={() => setEditing(true)}
      onGone={() => onDone(recipe.category)}
    />
  )
}
