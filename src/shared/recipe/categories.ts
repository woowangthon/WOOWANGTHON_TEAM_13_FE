import type { RecipeCategoryCount, RecipeSummary } from '@/lib/api/types'

// 공용: 레시피 기본 카테고리 6개 · 카테고리 줄 만들기 — 사장/알바 화면이 함께 사용 (담당: 민지)
// 빈 카테고리도 늘 보여야(사장님은 메뉴를 넣으려고, 알바는 같은 줄을 보려고) 기본 6개 + 사장님이 만든 이름 순서

/** 기본 카테고리 (사장님 레시피 추가 폼과 같은 6개) */
export const DEFAULT_CATEGORIES = ['커피', '라떼', '에이드', '스무디', '티', '디저트']

/** 기본 6개 + 메뉴에 있는 그 밖의 카테고리, 각 메뉴 수 ("티 0"처럼 0개도) */
export function categoryCounts(recipes: RecipeSummary[]): RecipeCategoryCount[] {
  const names = [
    ...DEFAULT_CATEGORIES,
    ...new Set(recipes.map((r) => r.category).filter((c) => !DEFAULT_CATEGORIES.includes(c))),
  ]
  return names.map((name) => ({ name, count: recipes.filter((r) => r.category === name).length }))
}
