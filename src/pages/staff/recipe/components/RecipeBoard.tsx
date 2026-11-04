import { Search } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { useManuals } from '@/lib/api/manuals'
import { useRecipes } from '@/lib/api/recipes'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { ManualGrid } from '@/shared/manual/ManualGrid'
import { CategoryTabs } from '@/shared/recipe/CategoryTabs'
import { RecipeGrid } from '@/shared/recipe/RecipeGrid'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { Spinner } from '@/ui/Spinner'
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
  const recipesQuery = useRecipes(storeId)

  const categories = recipesQuery.data?.categories ?? []
  const all = recipesQuery.data?.recipes ?? []

  const q = (params.get('q') ?? '').trim()
  const catParam = params.get('cat')
  const category =
    catParam && categories.some((c) => c.name === catParam)
      ? catParam
      : (recipesQuery.data?.defaultCategory ?? categories[0]?.name ?? '')

  const shown = q
    ? all.filter((r) => r.name.includes(q) || r.ingredients.some(({ name }) => name.includes(q)))
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

      {recipesQuery.isPending ? (
        <Spinner />
      ) : (
        <>
          <CategoryTabs
            categories={categories}
            value={q ? null : category}
            onChange={(c) => update({ cat: c, q: '' })}
          />

          <h2 className="m-0 px-1 text-lg font-extrabold tracking-[-0.02em]">
            {q ? `"${q}" 검색 결과 ${shown.length}개` : `${category} ${shown.length}개`}
          </h2>

          {shown.length > 0 ? (
            <RecipeGrid
              recipes={shown}
              getHref={(r) => ({
                pathname: `/staff/recipes/${r.recipeId}`,
                search: params.toString(),
              })}
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
        </>
      )}
    </div>
  )
}

function ManualCards({ storeId }: { storeId: string }) {
  const manualsQuery = useManuals(storeId)

  if (manualsQuery.isPending) return <Spinner />
  return (
    <ManualGrid
      manuals={manualsQuery.data?.manuals ?? []}
      getHref={(m) => `/staff/manuals/${m.manualId}`}
    />
  )
}
