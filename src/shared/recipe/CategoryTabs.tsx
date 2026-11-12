import type { RecipeCategoryCount } from '@/lib/api/types'
import { CATEGORY_ICON, DEFAULT_CATEGORY_ICON } from '@/shared/icons'
import { cn } from '@/ui/utils'

// 공용 보기 부품: 레시피 카테고리 탭 (커피 · 라떼 · 에이드 …) · 사장/알바 화면이 함께 사용 — 담당: 민지
// 모양 (사장 · 알바 같이, 11/13 나현 · 민지 OK): 아이콘 동그라미 + 이름 · 개수, 바깥 박스 없음 · 고른 칸은 동그라미 매장 색 + 굵게
// 6개까지(기본 6개)는 가로 스크롤 없이 한 줄에 똑같은 너비로 (375 · 360px 모두 6개 다 보임, 칸 약 51px),
// 사장님이 만든 이름이 더해져 6개를 넘으면 칸 64px 로 가로 스크롤
interface CategoryTabsProps {
  /** 카테고리 이름 · 메뉴 수 (사장님이 정한 순서) */
  categories: RecipeCategoryCount[]
  /** 선택한 카테고리. 검색 중처럼 고른 게 없으면 null */
  value: string | null
  onChange: (category: string) => void
}

/** 한 줄에 다 보이게 나누는 최대 칸 수 */
const FIT = 6

export function CategoryTabs({ categories, value, onChange }: CategoryTabsProps) {
  const fit = categories.length <= FIT
  return (
    <div
      className={cn(
        'py-0.5',
        fit ? 'grid grid-cols-6 gap-1' : 'no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4',
      )}
    >
      {categories.map(({ name: c, count }) => {
        const on = c === value
        const Icon = CATEGORY_ICON[c] ?? DEFAULT_CATEGORY_ICON
        return (
          <button
            key={c}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(c)}
            // 바깥 박스 없이 아이콘 동그라미 + 글자만. 고른 칸은 동그라미를 매장 색으로 채우고 글자 굵게
            // 누를 때 브라우저 회색 네모(탭 하이라이트 · 포커스 테두리)는 없애고, 키보드로 왔을 때만 칸 모양 둥근 테두리
            className={cn(
              'flex min-w-0 flex-col items-center gap-1.5 rounded-2xl pt-2.5 pb-2 text-foreground outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-brand/60',
              !fit && 'w-16 shrink-0',
            )}
          >
            <span
              className={cn(
                'flex size-9 items-center justify-center rounded-full transition-colors',
                on ? 'bg-brand text-white' : 'bg-brand-soft text-brand',
              )}
            >
              <Icon className="size-4.5" />
            </span>
            <span
              className={cn(
                'text-xs whitespace-nowrap tabular-nums',
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
