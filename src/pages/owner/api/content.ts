import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createManual,
  createRecipe,
  deleteManual,
  deleteRecipe,
  hideRecipe,
  scanRecipePhoto,
  updateManual,
  updateRecipe,
} from '@/api/mocks/owner/api'
import { manualKeys } from '@/lib/api/manuals'
import { recipeKeys } from '@/lib/api/recipes'
import { http, isRealApi } from '@/lib/api/source'
import { apiFetch } from '@/lib/apiClient'
import type { ManualInput, RecipeInput } from '@/pages/owner/api/types'

/*
 * 레시피 · 매뉴얼 등록 · 수정 · 삭제 훅 — 담당: 나현
 * 보기는 민지의 lib/api 훅(useRecipes · useManuals)을 그대로 쓰고, 바꾼 뒤 그 캐시를 다시 불러온다.
 * .env VITE_REAL_API 에 'recipes' · 'manuals'를 넣으면 진짜 API, 아니면 가짜 서버(api/mocks/owner).
 * 숨기기 · 사진 스캔은 아직 가짜 서버만 (BE 미구현). 알바생은 이 훅을 쓰지 않는다 (보기만).
 */

// 등록은 multipart: JSON 은 recipe · manual 칸에 문자열로 (사진 · 파일 칸은 BE 저장소가 정해지면)
const postForm = <T>(path: string, field: string, input: unknown) => {
  const form = new FormData()
  form.append(field, JSON.stringify(input))
  return apiFetch<T>(path, { method: 'POST', body: form })
}

const postRecipe = (storeId: string, input: RecipeInput) =>
  isRealApi('recipes')
    ? postForm<{ recipeId: string }>(`/stores/${storeId}/recipes`, 'recipe', input)
    : createRecipe(storeId, input)
const patchRecipe = (storeId: string, recipeId: string, input: RecipeInput) =>
  isRealApi('recipes')
    ? http.patch<{ recipeId: string }>(`/stores/${storeId}/recipes/${recipeId}`, input)
    : updateRecipe(storeId, recipeId, input)
const removeRecipe = (storeId: string, recipeId: string) =>
  isRealApi('recipes')
    ? http.delete<void>(`/stores/${storeId}/recipes/${recipeId}`)
    : deleteRecipe(storeId, recipeId)

const postManual = (storeId: string, input: ManualInput) =>
  isRealApi('manuals')
    ? postForm<{ manualId: string }>(`/stores/${storeId}/manuals`, 'manual', input)
    : createManual(storeId, input)
const patchManual = (storeId: string, manualId: string, input: ManualInput) =>
  isRealApi('manuals')
    ? http.patch<{ manualId: string }>(`/stores/${storeId}/manuals/${manualId}`, input)
    : updateManual(storeId, manualId, input)
const removeManual = (storeId: string, manualId: string) =>
  isRealApi('manuals')
    ? http.delete<void>(`/stores/${storeId}/manuals/${manualId}`)
    : deleteManual(storeId, manualId)

function useInvalidateRecipes(storeId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: recipeKeys.list(storeId) })
}

function useInvalidateManuals(storeId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: manualKeys.list(storeId) })
}

export function useCreateRecipe(storeId: string) {
  const invalidate = useInvalidateRecipes(storeId)
  return useMutation({
    mutationFn: (input: RecipeInput) => postRecipe(storeId, input),
    onSuccess: invalidate,
  })
}

export function useUpdateRecipe(storeId: string) {
  const invalidate = useInvalidateRecipes(storeId)
  return useMutation({
    mutationFn: ({ recipeId, input }: { recipeId: string; input: RecipeInput }) =>
      patchRecipe(storeId, recipeId, input),
    onSuccess: invalidate,
  })
}

export function useDeleteRecipe(storeId: string) {
  const invalidate = useInvalidateRecipes(storeId)
  return useMutation({
    mutationFn: (recipeId: string) => removeRecipe(storeId, recipeId),
    onSuccess: invalidate,
  })
}

export function useHideRecipe(storeId: string) {
  const invalidate = useInvalidateRecipes(storeId)
  return useMutation({
    mutationFn: (recipeId: string) => hideRecipe(storeId, recipeId),
    onSuccess: invalidate,
  })
}

/** 사진 → AI 초안 (P1). 저장하지 않는다 */
export function useScanRecipe() {
  return useMutation({ mutationFn: scanRecipePhoto })
}

export function useCreateManual(storeId: string) {
  const invalidate = useInvalidateManuals(storeId)
  return useMutation({
    mutationFn: (input: ManualInput) => postManual(storeId, input),
    onSuccess: invalidate,
  })
}

export function useUpdateManual(storeId: string) {
  const invalidate = useInvalidateManuals(storeId)
  return useMutation({
    mutationFn: ({ manualId, input }: { manualId: string; input: ManualInput }) =>
      patchManual(storeId, manualId, input),
    onSuccess: invalidate,
  })
}

export function useDeleteManual(storeId: string) {
  const invalidate = useInvalidateManuals(storeId)
  return useMutation({
    mutationFn: (manualId: string) => removeManual(storeId, manualId),
    onSuccess: invalidate,
  })
}
