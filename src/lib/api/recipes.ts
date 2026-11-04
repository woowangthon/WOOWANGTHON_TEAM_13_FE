import { useQuery } from '@tanstack/react-query'
import { getRecipe, getRecipes } from '@/api/mocks/staff/api/recipes'
import { retryExceptNotFound } from '@/lib/api/query'

/*
 * 레시피 훅 — 담당: 민지 (사장 화면도 import 해서 쓴다)
 * 지금은 가짜 서버(api/mocks/staff/api)를 부른다. BE 연결 시 fetch 함수 안쪽만
 * apiFetch(`/stores/${storeId}/recipes`) 또는 orval 생성 함수로 바꾸면 된다. 응답 모양: docs/07 3
 */

export const recipeKeys = {
  list: (storeId: string) => ['stores', storeId, 'recipes'] as const,
  detail: (storeId: string, recipeId: string) => ['stores', storeId, 'recipes', recipeId] as const,
}

const fetchRecipes = (storeId: string) => getRecipes(storeId)
const fetchRecipe = (storeId: string, recipeId: string) => getRecipe(storeId, recipeId)

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
    retry: retryExceptNotFound,
  })
}
