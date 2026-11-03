import { ChevronRight, Search, StickyNote } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { storeManuals } from '@/api/mocks/staff/manuals'
import {
  defaultRecipeCategory,
  recipeCategories,
  storeRecipes,
  type RecipeCategory,
} from '@/api/mocks/staff/recipes'
import { useStaffStore } from '@/pages/staff/staffStore'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { MANUAL_ICON } from '@/shared/icons'
import { CategoryTabs } from '@/shared/recipe/CategoryTabs'
import { RecipeGrid } from '@/shared/recipe/RecipeGrid'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { Tabs } from '@/ui/Tabs'

export type BoardSegment = 'recipe' | 'manual'

// 레시피 (포스기처럼 카테고리 → 메뉴 격자) · 매뉴얼 (바둑판 카드)
export function RecipeBoard({ segment }: { segment: BoardSegment }) {
  const { store } = useCurrentStore()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-2.5 px-1">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted-foreground">{store.name}</span>
          <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.03em]">
            {segment === 'recipe' ? '레시피' : '매뉴얼'}
          </h1>
        </div>
        <Tabs
          options={[
            { value: 'recipe', label: '레시피' },
            { value: 'manual', label: '매뉴얼' },
          ]}
          value={segment}
          onChange={(next) => navigate(next === 'recipe' ? '/staff/recipes' : '/staff/manuals')}
        />
      </div>
      {segment === 'recipe' ? (
        <RecipeSection storeId={store.id} />
      ) : (
        <ManualCards storeId={store.id} />
      )}
    </div>
  )
}

// 검색 · 카테고리는 주소(?q= · ?cat=)에 둔다. 탭 · 격자는 shared/recipe 부품
function RecipeSection({ storeId }: { storeId: string }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const categories = recipeCategories[storeId] ?? []
  const all = storeRecipes(storeId)

  const q = (params.get('q') ?? '').trim()
  const catParam = params.get('cat') as RecipeCategory | null
  const category =
    catParam && categories.includes(catParam)
      ? catParam
      : (defaultRecipeCategory[storeId] ?? categories[0])

  const counts = Object.fromEntries(
    categories.map((c) => [c, all.filter((r) => r.category === c).length]),
  )

  const shown = q
    ? all.filter((r) => r.name.includes(q) || r.ingredients.some(([name]) => name.includes(q)))
    : all.filter((r) => r.category === category)

  const update = (next: Record<string, string>) =>
    setParams(
      (prev) => {
        const merged = new URLSearchParams(prev)
        Object.entries(next).forEach(([key, value]) =>
          value ? merged.set(key, value) : merged.delete(key),
        )
        return merged
      },
      { replace: true },
    )

  return (
    <div className="flex flex-col gap-4">
      <label className="flex h-[54px] items-center gap-2.5 rounded-[20px] bg-card px-[18px] shadow-soft">
        <Search className="size-5 text-subtle" />
        <input
          value={params.get('q') ?? ''}
          onChange={(event) => update({ q: event.target.value })}
          placeholder="메뉴, 재료 검색"
          aria-label="메뉴, 재료 검색"
          className="min-w-0 flex-1 border-none bg-transparent text-[15px] placeholder:text-subtle"
        />
      </label>

      <CategoryTabs
        categories={categories}
        counts={counts}
        value={q ? null : category}
        onChange={(c) => update({ cat: c, q: '' })}
      />

      <h2 className="m-0 px-1 text-lg font-extrabold tracking-[-0.02em]">
        {q ? `"${q}" 검색 결과 ${shown.length}개` : `${category} ${shown.length}개`}
      </h2>

      {shown.length > 0 ? (
        <RecipeGrid
          recipes={shown}
          getHref={(r) => ({ pathname: `/staff/recipes/${r.id}`, search: params.toString() })}
        />
      ) : (
        <EmptyState
          message="검색 결과가 없어요"
          action={
            <Button
              size="md"
              className="h-[46px] px-5"
              onClick={() => navigate('/staff/chat', { state: { draft: q } })}
            >
              AI 사수에게 묻기
            </Button>
          }
        />
      )}
    </div>
  )
}

function ManualCards({ storeId }: { storeId: string }) {
  const umbrellaAdded = useStaffStore((state) => state.umbrellaAdded)
  const list = storeManuals(storeId, umbrellaAdded)

  if (list.length === 0) return <EmptyState message="아직 등록된 매뉴얼이 없어요" />

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {list.map((m) => {
        const Icon = MANUAL_ICON[m.icon] ?? StickyNote
        return (
          <Link
            key={m.id}
            to={`/staff/manuals/${m.id}`}
            className="flex min-h-[170px] flex-col gap-[9px] rounded-[26px] bg-card p-4 text-foreground shadow-soft"
          >
            <span className="flex w-full items-start justify-between">
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Icon className="size-5" />
              </span>
              {m.isNew && <Badge>NEW</Badge>}
            </span>
            <span className="text-[17px] font-bold">{m.title}</span>
            <span className="line-clamp-2 text-[13px] leading-normal text-[#6B7068]">{m.body}</span>
            <span className="mt-auto flex size-8 items-center justify-center self-end rounded-full bg-foreground text-white">
              <ChevronRight className="size-5" />
            </span>
          </Link>
        )
      })}
    </div>
  )
}
