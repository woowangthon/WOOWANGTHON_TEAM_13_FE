import { Link, type To } from 'react-router'
import type { RecipeSummary } from '@/lib/api/types'
import { CATEGORY_ICON, DEFAULT_CATEGORY_ICON, getCategoryTint } from '@/shared/icons'
import { RecipePhoto } from '@/shared/recipe/RecipePhoto'
import { PRESSABLE, PRESSABLE_CARD } from '@/shared/pressable'
import { cn } from '@/ui/utils'
import { Badge } from '@/ui/Badge'

// 공용 보기 부품: 포스기식 메뉴 버튼 격자 · 사장/알바 화면이 함께 사용 — 담당: 민지
// 사진 자리는 납작하게 둬서 한 화면에 더 많이 보이게 한다. 메뉴 사진(imageUrl)이 있으면 사진, 없으면 카테고리 아이콘
// 누르면 갈 주소는 화면마다 달라서 getHref 로 받는다 (알바 /staff/recipes/:id · 사장 /owner/recipes/:id)
// variant
//   default: 사진이 카드 전체(1.6:1)를 채우고 위 · 아래만 살짝 어둡게, NEW · 이름(14px) · 아래 줄(11px, "ICE · 16oz · 재료 3가지")은 사진 위 흰 글자 (사장님 화면, 11/13 나현 · 민지 OK)
//   clean:   그림자 없는 카드(24) + 사진 2:1(16) · 이름 16px / 아래 줄 13px · 온도는 아래 줄 글자로 (docs/08 · 알바 화면)
interface RecipeGridProps {
  recipes: RecipeSummary[]
  getHref: (recipe: RecipeSummary) => To
  variant?: 'default' | 'clean'
}

export function RecipeGrid({ recipes, getHref, variant = 'default' }: RecipeGridProps) {
  if (variant === 'clean') return <CleanGrid recipes={recipes} getHref={getHref} />
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {recipes.map((r) => {
        const Icon = CATEGORY_ICON[r.category] ?? DEFAULT_CATEGORY_ICON
        const [tint, ink] = getCategoryTint(r.category)
        return (
          <Link
            key={r.recipeId}
            to={getHref(r)}
            // 상세는 목록 위에 뜨는 시트라 목록 스크롤 자리를 그대로 둔다
            preventScrollReset
            className={cn(
              'relative isolate flex aspect-[1.6] flex-col justify-between overflow-hidden rounded-[22px] p-3 shadow-soft',
              r.imageUrl ? 'text-white' : 'text-foreground',
              PRESSABLE_CARD,
            )}
            style={{ background: tint }}
          >
            {/* 사진이 카드 전체를 채운다 (없으면 카테고리 아이콘이 가운데) */}
            <span className="absolute inset-0 -z-10 flex items-center justify-center">
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
            </span>
            {/* 위 · 아래만 살짝 어둡게 (온도 · NEW 와 이름이 사진 위에서도 읽히게) */}
            {r.imageUrl && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0)_32%,rgba(0,0,0,0)_45%,rgba(0,0,0,0.62)_100%)]"
              />
            )}
            {/* 위 오른쪽: NEW 만 (온도는 아래 줄 "ICE · 16oz · 재료 3가지"로) */}
            <span className="flex justify-end">
              {r.isNew && <Badge aria-label="새 레시피">NEW</Badge>}
            </span>
            <span className="flex flex-col gap-0.5 [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]">
              <span className="text-sm leading-[1.3] font-bold break-keep">{r.name}</span>
              <span className={cn('text-[11px]', r.imageUrl ? 'text-white/85' : 'text-subtle')}>
                {[r.temp, r.size, `재료 ${r.ingredients.length}가지`].filter(Boolean).join(' · ')}
              </span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}

function CleanGrid({ recipes, getHref }: Omit<RecipeGridProps, 'variant'>) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {recipes.map((r) => {
        const Icon = CATEGORY_ICON[r.category] ?? DEFAULT_CATEGORY_ICON
        const [tint, ink] = getCategoryTint(r.category)
        return (
          <Link
            key={r.recipeId}
            to={getHref(r)}
            // 상세는 목록 위에 뜨는 시트라 목록 스크롤 자리를 그대로 둔다
            preventScrollReset
            className={cn(
              'flex flex-col gap-2 rounded-3xl bg-card p-2 pb-3 text-foreground',
              PRESSABLE,
            )}
          >
            <span
              className="relative flex aspect-2/1 w-full items-center justify-center overflow-hidden rounded-2xl"
              style={{ background: tint }}
            >
              <RecipePhoto
                imageUrl={r.imageUrl}
                fallback={<Icon aria-hidden="true" className="size-6" style={{ color: ink }} />}
              />
              {r.isNew && (
                <Badge className="absolute top-2 right-2" aria-label="새 레시피">
                  NEW
                </Badge>
              )}
            </span>
            <span className="flex flex-col gap-0.5 px-1">
              <span className="text-base leading-[1.4] font-bold tracking-[-0.01em] break-keep">
                {r.name}
              </span>
              <span className="text-[13px] font-medium text-muted-foreground tabular-nums">
                {[r.temp, r.size, `재료 ${r.ingredients.length}가지`].filter(Boolean).join(' · ')}
              </span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
