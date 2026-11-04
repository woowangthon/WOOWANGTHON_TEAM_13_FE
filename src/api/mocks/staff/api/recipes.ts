import {
  defaultRecipeCategory,
  recipeCategories,
  storeRecipes,
  type Recipe as MockRecipe,
} from '@/api/mocks/staff/recipes'
import { ApiError } from '@/lib/apiClient'
import type { Recipe, RecipeList, RecipeSummary } from '@/lib/api/types'

// 가짜 서버: 레시피 API (docs/07 3) — 가짜 데이터(recipes.ts)를 API 응답 모양으로 바꿔 돌려준다

const UPDATED_AT = '2026-11-15T10:00:00+09:00'
const NEW_UPDATED_AT = '2026-11-20T09:30:00+09:00'

function toSummary(r: MockRecipe): RecipeSummary {
  return {
    recipeId: r.id,
    name: r.name,
    category: r.category,
    temp: r.temp,
    size: r.size,
    ingredients: r.ingredients.map(([name, amount]) => ({ name, amount })),
    isNew: !!r.isNew,
    updatedAt: r.isNew ? NEW_UPDATED_AT : UPDATED_AT,
  }
}

/** GET /stores/{storeId}/recipes */
export async function getRecipes(storeId: string): Promise<RecipeList> {
  const all = storeRecipes(storeId)
  const categories = recipeCategories[storeId] ?? []
  return {
    categories: categories.map((name) => ({
      name,
      count: all.filter((r) => r.category === name).length,
    })),
    defaultCategory: defaultRecipeCategory[storeId] ?? null,
    recipes: all.map(toSummary),
  }
}

/** GET /stores/{storeId}/recipes/{recipeId} */
export async function getRecipe(storeId: string, recipeId: string): Promise<Recipe> {
  const recipe = storeRecipes(storeId).find((r) => r.id === recipeId)
  if (!recipe) {
    throw new ApiError(404, { code: 'NOT_FOUND', message: '레시피를 찾지 못했어요', detail: null })
  }
  return { ...toSummary(recipe), steps: recipe.steps, memo: recipe.memo ?? null }
}
