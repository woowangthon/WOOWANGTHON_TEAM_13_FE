import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { isNotFound, useQueryErrorToast } from '@/lib/api/query'
import { useRecipe } from '@/lib/api/recipes'
import { RecipeBoard } from '@/pages/staff/recipe/components/RecipeBoard'
import { RecipeSheet } from '@/pages/staff/recipe/components/RecipeSheet'
import { useCloseTo } from '@/pages/staff/useCloseTo'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'

// 레시피 상세: 레시피 목록 위에 상세 시트를 띄운다
export default function RecipeDetailPage() {
  const { recipeId = '' } = useParams()
  const { store } = useCurrentStore()
  const { search } = useLocation()
  const navigate = useNavigate()
  const close = useCloseTo(`/staff/recipes${search}`)
  const recipeQuery = useRecipe(store.id, recipeId)
  useQueryErrorToast(recipeQuery)

  // 다른 매장 레시피 · 삭제된 레시피면 (매장을 바꾼 경우 등) 목록으로 돌아간다
  if (isNotFound(recipeQuery.error)) return <Navigate to="/staff/recipes" replace />

  const recipe = recipeQuery.data
  return (
    <>
      <RecipeBoard segment="recipe" />
      {recipe && (
        <RecipeSheet
          recipe={recipe}
          storeName={store.name}
          onClose={close}
          onAsk={() => navigate('/staff/chat', { state: { draft: `${recipe.name} ` } })}
        />
      )}
    </>
  )
}
