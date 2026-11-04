/*
 * API 응답 타입 — 담당: 민지
 * 모양은 docs/07_API_응답_제안.md 기준. BE 가 확정하거나 orval 로 타입이 생기면 여기를 맞춘다.
 * 화면 · shared 부품은 가짜 데이터(api/mocks) 타입 대신 이 타입을 쓴다.
 */

// ── 레시피 (docs/07 3) ──

export type RecipeTemp = 'ICE' | 'HOT' | 'DESSERT'

export interface Ingredient {
  name: string
  amount: string
}

/** 레시피 목록 항목 (3-1) */
export interface RecipeSummary {
  recipeId: string
  name: string
  /** 사장님이 정한 카테고리 이름 (커피 · 라떼 …) */
  category: string
  temp: RecipeTemp
  size: string
  ingredients: Ingredient[]
  isNew: boolean
  updatedAt: string
}

/** 레시피 상세 (3-2) */
export interface Recipe extends RecipeSummary {
  steps: string[]
  memo: string | null
}

export interface RecipeCategoryCount {
  name: string
  count: number
}

/** GET /stores/{storeId}/recipes */
export interface RecipeList {
  categories: RecipeCategoryCount[]
  defaultCategory: string | null
  recipes: RecipeSummary[]
}

// ── 매뉴얼 (docs/07 4) ──

/** 템플릿 아이콘 키. 직접 추가한 매뉴얼은 null */
export type ManualIcon =
  'wifi' | 'restroom' | 'open' | 'close' | 'delivery' | 'refund' | 'milk' | 'umbrella'

export interface Manual {
  manualId: string
  icon: ManualIcon | null
  title: string
  body: string
  isNew: boolean
  updatedAt: string
}

/** GET /stores/{storeId}/manuals */
export interface ManualList {
  manuals: Manual[]
}
