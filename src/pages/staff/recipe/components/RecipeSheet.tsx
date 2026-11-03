import { Sparkles, StickyNote } from 'lucide-react'
import type { Recipe } from '@/api/mocks/staff/recipes'
import { CATEGORY_ICON, CATEGORY_TINT } from '@/shared/icons'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'

// 레시피 상세 시트: 재료 · 양 표 + 만드는 순서 + 메모
interface RecipeSheetProps {
  recipe: Recipe
  storeName: string
  onClose: () => void
  onAsk: () => void
}

export function RecipeSheet({ recipe, storeName, onClose, onAsk }: RecipeSheetProps) {
  const Icon = CATEGORY_ICON[recipe.category]
  const [tint, ink] = CATEGORY_TINT[recipe.category]

  return (
    <BottomSheet open onClose={onClose} label={recipe.name}>
      <div className="flex flex-col gap-[18px]">
        <div
          className="relative flex h-[150px] items-center justify-center rounded-[24px]"
          style={{ background: tint }}
        >
          <span
            className="flex size-[84px] items-center justify-center rounded-full bg-white/60"
            style={{ color: ink }}
          >
            <Icon className="size-10" />
          </span>
          <span
            className="absolute top-3.5 left-3.5 rounded-full bg-white/70 px-[9px] py-1 text-[11px] font-extrabold"
            style={{ color: ink }}
          >
            {recipe.temp} · {recipe.size}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted-foreground">
            {storeName} · {recipe.category}
          </span>
          <h2 className="m-0 text-2xl font-extrabold tracking-[-0.02em]">{recipe.name}</h2>
        </div>

        <dl className="m-0 flex flex-col rounded-[22px] bg-white px-[18px] py-1">
          {recipe.ingredients.map(([name, amount]) => (
            <div
              key={name}
              className="flex justify-between gap-3 border-b border-[#F0EBE2] py-3.5 text-base last:border-b-0"
            >
              <dt className="text-[#6B7068]">{name}</dt>
              <dd className="m-0 font-extrabold">{amount}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-3">
          <h3 className="m-0 text-[17px] font-bold">만드는 순서</h3>
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

        <Button variant="ink" className="text-sm" onClick={onAsk}>
          <Sparkles />
          AI 사수에게 묻기
        </Button>
      </div>
    </BottomSheet>
  )
}
