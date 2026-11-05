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
import type { ManualInput, RecipeInput } from '@/pages/owner/api/types'

/*
 * 레시피 · 매뉴얼 등록 · 수정 · 삭제 훅 (임시, 담당: 나현)
 * 보기는 민지의 lib/api 훅(useRecipes · useManuals)을 그대로 쓰고, 바꾼 뒤 그 캐시를 다시 불러온다.
 */

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
    mutationFn: (input: RecipeInput) => createRecipe(storeId, input),
    onSuccess: invalidate,
  })
}

export function useUpdateRecipe(storeId: string) {
  const invalidate = useInvalidateRecipes(storeId)
  return useMutation({
    mutationFn: ({ recipeId, input }: { recipeId: string; input: RecipeInput }) =>
      updateRecipe(storeId, recipeId, input),
    onSuccess: invalidate,
  })
}

export function useDeleteRecipe(storeId: string) {
  const invalidate = useInvalidateRecipes(storeId)
  return useMutation({
    mutationFn: (recipeId: string) => deleteRecipe(storeId, recipeId),
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
    mutationFn: (input: ManualInput) => createManual(storeId, input),
    onSuccess: invalidate,
  })
}

export function useUpdateManual(storeId: string) {
  const invalidate = useInvalidateManuals(storeId)
  return useMutation({
    mutationFn: ({ manualId, input }: { manualId: string; input: ManualInput }) =>
      updateManual(storeId, manualId, input),
    onSuccess: invalidate,
  })
}

export function useDeleteManual(storeId: string) {
  const invalidate = useInvalidateManuals(storeId)
  return useMutation({
    mutationFn: (manualId: string) => deleteManual(storeId, manualId),
    onSuccess: invalidate,
  })
}
