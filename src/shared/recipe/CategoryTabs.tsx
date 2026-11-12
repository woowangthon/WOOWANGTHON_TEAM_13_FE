import type { RecipeCategoryCount } from '@/lib/api/types'
import { CATEGORY_ICON, DEFAULT_CATEGORY_ICON } from '@/shared/icons'
import { cn } from '@/ui/utils'

// 공용 보기 부품: 레시피 카테고리 탭 (커피 · 라떼 · 에이드 …) · 사장/알바 화면이 함께 사용 — 담당: 민지
// 모양 (사장 · 알바 같이, 11/13 나현 · 민지 OK): 아이콘 동그라미 + 이름 · 개수, 바깥 박스 없음 · 칸 76px · 고른 칸은 동그라미 매장 색 + 굵게
interface CategoryTabsProps {
  /** 카테고리 이름 · 메뉴 수 (사장님이 정한 순서) */
  categories: RecipeCategoryCount[]
  /** 선택한 카테고리. 검색 중처럼 고른 게 없으면 null */
  value: string | null
  onChange: (category: string) => void
}

export function CategoryTabs({ categories, value, onChange }: CategoryTabsProps) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5">
      {categories.map(({ name: c, count }) => {
        const on = c === value
        const Icon = CATEGORY_ICON[c] ?? DEFAULT_CATEGORY_ICON
        return (
          <button
            key={c}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(c)}
            // 바깥 박스 없이 아이콘 동그라미 + 글자만 (칸 너비 · 간격은 그대로). 고른 칸은 동그라미를 매장 색으로 채우고 글자 굵게
            className="flex w-[76px] shrink-0 flex-col items-center gap-2 px-0.5 pt-3 pb-[11px] text-foreground"
          >
            <span
              className={cn(
                'flex size-10 items-center justify-center rounded-full transition-colors',
                on ? 'bg-brand text-white' : 'bg-brand-soft text-brand',
              )}
            >
              <Icon className="size-5" />
            </span>
            <span
              className={cn(
                'text-xs whitespace-nowrap',
                on ? 'font-extrabold' : 'font-semibold text-muted-foreground',
              )}
            >
              {c} <span className="opacity-55">{count}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
