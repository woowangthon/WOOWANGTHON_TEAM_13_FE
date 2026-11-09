import { Link, type To } from 'react-router'
import type { RecipeSummary } from '@/lib/api/types'
import { CATEGORY_ICON, DEFAULT_CATEGORY_ICON, getCategoryTint } from '@/shared/icons'
import { RecipePhoto } from '@/shared/recipe/RecipePhoto'
import { PRESSABLE_CARD } from '@/shared/pressable'
import { cn } from '@/ui/utils'
import { Badge } from '@/ui/Badge'

// 공용 보기 부품: 포스기식 메뉴 버튼 격자 · 사장/알바 화면이 함께 사용 — 담당: 민지
// 사진 자리는 납작하게 둬서 한 화면에 더 많이 보이게 한다. 메뉴 사진(imageUrl)이 있으면 사진, 없으면 카테고리 아이콘
// 누르면 갈 주소는 화면마다 달라서 getHref 로 받는다 (알바 /staff/recipes/:id · 사장 /owner/recipes/:id)
interface RecipeGridProps {
  recipes: RecipeSummary[]
  getHref: (recipe: RecipeSummary) => To
}

export function RecipeGrid({ recipes, getHref }: RecipeGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {recipes.map((r) => {
        const Icon = CATEGORY_ICON[r.category] ?? DEFAULT_CATEGORY_ICON
        const [tint, ink] = getCategoryTint(r.category)
        return (
          <Link
            key={r.recipeId}
            to={getHref(r)}
            className={cn(
              'flex flex-col gap-2 rounded-[26px] bg-card px-2.5 pt-2.5 pb-3 text-foreground shadow-soft',
              PRESSABLE_CARD,
            )}
          >
            <span
              className="relative flex aspect-[2.4] w-full items-center justify-center overflow-hidden rounded-[18px]"
              style={{ background: tint }}
            >
              <RecipePhoto
                imageUrl={r.imageUrl}
                fallback={
                  <span
                    className="flex size-10 items-center justify-center rounded-full bg-white/60"
                    style={{ color: ink }}
                  >
                    <Icon className="size-5" />
                  </span>
                }
              />
              {r.temp && (
                <span
                  className="absolute top-2 left-2 rounded-full bg-white/70 px-[7px] py-[3px] text-[10px] font-extrabold"
                  style={{ color: ink }}
                >
                  {r.temp}
                </span>
              )}
              {r.isNew && (
                <Badge className="absolute top-2 right-2" aria-label="새 레시피">
                  NEW
                </Badge>
              )}
            </span>
            <span className="flex flex-col gap-[3px] px-1">
              <span className="text-[15px] leading-[1.3] font-bold break-keep">{r.name}</span>
              <span className="text-xs text-subtle">
                {[r.size, `재료 ${r.ingredients.length}가지`].filter(Boolean).join(' · ')}
              </span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
