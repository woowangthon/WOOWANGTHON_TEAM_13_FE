import { useQuery } from '@tanstack/react-query'
import { menuPhotoUrl } from '@/api/mocks/owner/menuPhotos'
import { getRecipe, getRecipes } from '@/api/mocks/staff/api/recipes'
import { http, isRealApi } from '@/lib/api/source'
import type { Recipe, RecipeList, RecipeSummary } from '@/lib/api/types'

/*
 * 레시피 훅 — 담당: 민지 (사장 화면도 import 해서 쓴다)
 * .env VITE_REAL_API 에 'recipes'를 넣으면 진짜 API(apiFetch), 아니면 가짜 서버(api/mocks/staff/api) — lib/api/source. 경로 · 응답: docs/07 3
 */

export const recipeKeys = {
  list: (storeId: string) => ['stores', storeId, 'recipes'] as const,
  detail: (storeId: string, recipeId: string) => ['stores', storeId, 'recipes', recipeId] as const,
}

/**
 * 메뉴 사진: BE 가 imageUrl 을 주면 그걸, 없으면(아직 BE 에 칸이 없음) 메뉴 이름으로 시연 사진(나현 api/mocks/owner/menuPhotos)을 찾는다.
 * 진짜 · 가짜 모두 여기 한곳에서 채워서 사장 · 알바 화면이 같은 사진을 본다
 */
function withPhoto<T extends RecipeSummary>(recipe: T): T {
  return { ...recipe, imageUrl: recipe.imageUrl ?? menuPhotoUrl(recipe.name) }
}

const fetchRecipes = async (storeId: string): Promise<RecipeList> => {
  const list = isRealApi('recipes')
    ? await http.get<RecipeList>(`/stores/${storeId}/recipes`)
    : await getRecipes(storeId)
  return { ...list, recipes: list.recipes.map(withPhoto) }
}
const fetchRecipe = async (storeId: string, recipeId: string): Promise<Recipe> =>
  withPhoto(
    isRealApi('recipes')
      ? await http.get<Recipe>(`/stores/${storeId}/recipes/${recipeId}`)
      : await getRecipe(storeId, recipeId),
  )

/** 레시피 목록: 카테고리(개수) · 처음 카테고리 · 메뉴 */
export function useRecipes(storeId: string) {
  return useQuery({
    queryKey: recipeKeys.list(storeId),
    queryFn: () => fetchRecipes(storeId),
  })
}

/** 레시피 상세: 재료 · 순서 · 메모 */
export function useRecipe(storeId: string, recipeId: string) {
  return useQuery({
    queryKey: recipeKeys.detail(storeId, recipeId),
    queryFn: () => fetchRecipe(storeId, recipeId),
  })
}
