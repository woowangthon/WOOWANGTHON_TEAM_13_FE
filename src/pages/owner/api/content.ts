import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createManual,
  createRecipe,
  deleteManual,
  deleteRecipe,
  scanRecipePhoto,
  updateManual,
  updateRecipe,
} from '@/api/mocks/owner/api'
import { manualKeys } from '@/lib/api/manuals'
import { recipeKeys } from '@/lib/api/recipes'
import { http, isRealApi } from '@/lib/api/source'
import { apiFetch } from '@/lib/apiClient'
import type { ManualInput, RecipeInput, RecipeScanDraft } from '@/pages/owner/api/types'

/*
 * 레시피 · 매뉴얼 등록 · 수정 · 삭제 훅 — 담당: 나현
 * 보기는 민지의 lib/api 훅(useRecipes · useManuals)을 그대로 쓰고, 바꾼 뒤 그 캐시를 다시 불러온다.
 * .env VITE_REAL_API 에 'recipes' · 'manuals'를 넣으면 진짜 API, 아니면 가짜 서버(api/mocks/owner).
 * 사진 스캔도 'recipes'를 따른다 (사진은 저장하지 않고 초안만 받는다). 알바생은 이 훅을 쓰지 않는다 (보기만).
 */

// 등록은 multipart: JSON 은 recipe · manual 칸에 문자열로, 파일은 files 의 칸 이름으로
const postForm = <T>(
  path: string,
  field: string,
  input: unknown,
  files: Record<string, File> = {},
) => {
  const form = new FormData()
  form.append(field, JSON.stringify(input))
  for (const [name, file] of Object.entries(files)) form.append(name, file)
  return apiFetch<T>(path, { method: 'POST', body: form })
}

// 메뉴 사진은 JSON 이 아니라 파일 칸(image)으로 보낸다. 레시피 사진(recipeImage)은 FE 에서 쓰지 않는다
const withoutPhoto = (input: RecipeInput): Omit<RecipeInput, 'photo'> => {
  const rest = { ...input }
  delete rest.photo
  return rest
}

const postRecipe = (storeId: string, input: RecipeInput) =>
  isRealApi('recipes')
    ? postForm<{ recipeId: string }>(
        `/stores/${storeId}/recipes`,
        'recipe',
        withoutPhoto(input),
        input.photo ? { image: input.photo } : {},
      )
    : createRecipe(storeId, input)

// 수정: 글은 PATCH(JSON), 메뉴 사진은 따로 — 새 파일이면 PUT · null 이면 DELETE · undefined 면 그대로
const patchRecipe = async (storeId: string, recipeId: string, input: RecipeInput) => {
  if (!isRealApi('recipes')) return updateRecipe(storeId, recipeId, input)
  const path = `/stores/${storeId}/recipes/${recipeId}`
  const saved = await http.patch<{ recipeId: string }>(path, withoutPhoto(input))
  if (input.photo) {
    const form = new FormData()
    form.append('image', input.photo)
    await apiFetch(`${path}/images/menu`, { method: 'PUT', body: form })
  } else if (input.photo === null) {
    await http.delete<void>(`${path}/images/menu`)
  }
  return saved
}
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
  return () => {
    queryClient.invalidateQueries({ queryKey: recipeKeys.list(storeId) })
  }
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

const postScan = async (storeId: string, image: File): Promise<RecipeScanDraft> => {
  if (!isRealApi('recipes')) return scanRecipePhoto()
  const form = new FormData()
  form.append('image', image)
  return apiFetch<RecipeScanDraft>(`/stores/${storeId}/recipe-scans`, {
    method: 'POST',
    body: form,
  })
}

/** 사진 → AI 초안 (P1). 저장하지 않는다 */
export function useScanRecipe(storeId: string) {
  return useMutation({ mutationFn: (image: File) => postScan(storeId, image) })
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
