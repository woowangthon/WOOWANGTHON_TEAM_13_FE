import { useQuery } from '@tanstack/react-query'
import { getRecipe, getRecipes } from '@/api/mocks/staff/api/recipes'
import { http, isRealApi } from '@/lib/api/source'
import type { Recipe, RecipeList } from '@/lib/api/types'

/*
 * 레시피 훅 — 담당: 민지 (사장 화면도 import 해서 쓴다)
 * .env VITE_REAL_API 에 'recipes'를 넣으면 진짜 API(apiFetch), 아니면 가짜 서버(api/mocks/staff/api) — lib/api/source. 경로 · 응답: docs/07 3
 */

export const recipeKeys = {
  list: (storeId: string) => ['stores', storeId, 'recipes'] as const,
  detail: (storeId: string, recipeId: string) => ['stores', storeId, 'recipes', recipeId] as const,
}

const fetchRecipes = (storeId: string) =>
  isRealApi('recipes') ? http.get<RecipeList>(`/stores/${storeId}/recipes`) : getRecipes(storeId)
const fetchRecipe = (storeId: string, recipeId: string) =>
  isRealApi('recipes')
    ? http.get<Recipe>(`/stores/${storeId}/recipes/${recipeId}`)
    : getRecipe(storeId, recipeId)

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
