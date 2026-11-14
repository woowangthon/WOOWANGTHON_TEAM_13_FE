import { StickyNote } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Recipe } from '@/lib/api/types'
import { CATEGORY_ICON, DEFAULT_CATEGORY_ICON, getCategoryTint } from '@/shared/icons'
import { RecipePhoto } from '@/shared/recipe/RecipePhoto'

// 공용 보기 부품: 레시피 카드 (재료 · 양 · 순서 · 메모) · 사장/알바 화면이 함께 사용 — 담당: 민지
// 맨 아래 버튼(알바: AI 사수에게 묻기 · 사장: 수정)은 footer 로 받는다
// variant
//   default: 지금 사장님 화면 모양
//   clean:   사진 2:1(모서리 16) · 온도/사이즈는 이름 위 작은 글자 · 제목 26px · 재료 표 숫자 tabular-nums ·
//            순서 번호는 옅은 매장 색 · 덩어리 사이 24px (docs/08 · 알바 화면)
interface RecipeCardProps {
  recipe: Recipe
  storeName: string
  footer?: ReactNode
  /** 목록 내용으로 먼저 보여 주는 중 → 만드는 순서 자리에 안내 한 줄 */
  stepsPending?: boolean
  variant?: 'default' | 'clean'
}

export function RecipeCard({
  recipe,
  storeName,
  footer,
  stepsPending,
  variant = 'default',
}: RecipeCardProps) {
  if (variant === 'clean') {
    return (
      <CleanRecipeCard
        recipe={recipe}
        storeName={storeName}
        footer={footer}
        stepsPending={stepsPending}
      />
    )
  }

  const Icon = CATEGORY_ICON[recipe.category] ?? DEFAULT_CATEGORY_ICON
  const [tint, ink] = getCategoryTint(recipe.category)
  // 온도 · 사이즈는 정하지 않으면 null → 있는 것만 (둘 다 없으면 배지 없음)
  const tempSize = [recipe.temp, recipe.size].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-[18px]">
      <div
        className="relative flex h-24 items-center justify-center overflow-hidden rounded-[24px]"
        style={{ background: tint }}
      >
        <RecipePhoto
          imageUrl={recipe.imageUrl}
          fallback={
            <span
              className="flex size-14 items-center justify-center rounded-full bg-white/60"
              style={{ color: ink }}
            >
              <Icon className="size-7" />
            </span>
          }
        />
        {tempSize && (
          <span
            className="absolute top-3.5 left-3.5 rounded-full bg-white/70 px-[9px] py-1 text-[11px] font-extrabold"
            style={{ color: ink }}
          >
            {tempSize}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-muted-foreground">
          {storeName} · {recipe.category}
        </span>
        <h2 className="m-0 text-2xl font-extrabold tracking-[-0.02em]">{recipe.name}</h2>
      </div>

      <dl className="m-0 flex flex-col rounded-[22px] bg-white px-[18px] py-1">
        {recipe.ingredients.map(({ name, amount }) => (
          <div
            key={name}
            className="flex justify-between gap-3 border-b border-[#F0EBE2] py-3.5 text-base last:border-b-0"
          >
            <dt className="text-muted-foreground">{name}</dt>
            <dd className="m-0 font-extrabold">{amount}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3">
        <h3 className="m-0 text-[17px] font-bold">만드는 순서</h3>
        {stepsPending && (
          <p className="m-0 animate-pulse text-sm text-subtle">순서를 불러오고 있어요</p>
        )}
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {recipe.steps.map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5 text-[15px] leading-[1.55]">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {recipe.memo && (
        <div className="flex gap-2 rounded-[18px] bg-warm px-4 py-3.5 text-sm leading-normal text-[#5A4130]">
          <StickyNote className="size-[18px] shrink-0 text-new" />
          {recipe.memo}
        </div>
      )}

      {footer}
    </div>
  )
}

function CleanRecipeCard({
  recipe,
  storeName,
  footer,
  stepsPending,
}: Omit<RecipeCardProps, 'variant'>) {
  const Icon = CATEGORY_ICON[recipe.category] ?? DEFAULT_CATEGORY_ICON
  const [tint, ink] = getCategoryTint(recipe.category)
  const tempSize = [recipe.temp, recipe.size].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div
          className="relative flex aspect-2/1 w-full items-center justify-center overflow-hidden rounded-2xl"
          style={{ background: tint }}
        >
          <RecipePhoto
            imageUrl={recipe.imageUrl}
            fallback={<Icon aria-hidden="true" className="size-8" style={{ color: ink }} />}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-muted-foreground">
            {[`${storeName} · ${recipe.category}`, tempSize].filter(Boolean).join(' · ')}
          </span>
          <h2 className="m-0 text-[26px] leading-[1.25] font-extrabold tracking-[-0.03em] break-keep">
            {recipe.name}
          </h2>
        </div>
      </div>

      <dl className="m-0 flex flex-col rounded-2xl bg-white px-4">
        {recipe.ingredients.map(({ name, amount }) => (
          <div
            key={name}
            className="flex justify-between gap-3 border-b border-line/60 py-3.5 text-[15px] last:border-b-0"
          >
            <dt className="text-muted-foreground">{name}</dt>
            <dd className="m-0 font-bold tabular-nums">{amount}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3">
        <h3 className="m-0 text-base leading-[1.4] font-bold">만드는 순서</h3>
        {stepsPending && (
          <p className="m-0 text-[13px] text-subtle motion-safe:animate-pulse">
            순서를 불러오고 있어요
          </p>
        )}
        <ol className="m-0 flex list-none flex-col gap-4 p-0">
          {recipe.steps.map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand tabular-nums">
                {i + 1}
              </span>
              <span className="text-[15px] leading-[1.55]">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {recipe.memo && (
        <div className="flex gap-2 rounded-2xl bg-warm px-4 py-3 text-[15px] leading-[1.55] text-foreground">
          <StickyNote aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warm-foreground" />
          {recipe.memo}
        </div>
      )}

      {footer}
    </div>
  )
}
