import type { RecipeCategory } from '@/api/mocks/staff/recipes'
import { CATEGORY_ICON } from '@/shared/icons'
import { cn } from '@/ui/utils'

// 공용 보기 부품: 레시피 카테고리 탭 (커피 · 라떼 · 에이드 …) · 사장/알바 화면이 함께 사용 — 담당: 민지
interface CategoryTabsProps {
  categories: RecipeCategory[]
  /** 카테고리별 메뉴 수 */
  counts: Partial<Record<RecipeCategory, number>>
  /** 선택한 카테고리. 검색 중처럼 고른 게 없으면 null */
  value: RecipeCategory | null
  onChange: (category: RecipeCategory) => void
}

export function CategoryTabs({ categories, counts, value, onChange }: CategoryTabsProps) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5">
      {categories.map((c) => {
        const on = c === value
        const Icon = CATEGORY_ICON[c]
        return (
          <button
            key={c}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(c)}
            className={cn(
              'flex w-[76px] shrink-0 flex-col items-center gap-2 rounded-[24px] px-0.5 pt-3 pb-[11px]',
              on
                ? 'bg-brand text-white shadow-[0_8px_20px_rgba(30,40,32,0.18)]'
                : 'bg-card text-foreground shadow-[0_6px_18px_rgba(40,46,36,0.05)]',
            )}
          >
            <span
              className={cn(
                'flex size-10 items-center justify-center rounded-full text-brand',
                on ? 'bg-white' : 'bg-brand-soft',
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="text-xs font-bold whitespace-nowrap">
              {c} <span className="opacity-55">{counts[c] ?? 0}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
