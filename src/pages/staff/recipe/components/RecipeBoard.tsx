import { Search } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { useManuals } from '@/lib/api/manuals'
import { useRecipes } from '@/lib/api/recipes'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { EmptyGuide } from '@/shared/EmptyGuide'
import { LoadError } from '@/shared/LoadError'
import { ManualGrid } from '@/shared/manual/ManualGrid'
import { CategoryTabs } from '@/shared/recipe/CategoryTabs'
import { RecipeGrid } from '@/shared/recipe/RecipeGrid'
import { SectionHeader } from '@/shared/SectionHeader'
import { Skeleton, SkeletonGroup } from '@/shared/Skeleton'
import { Button } from '@/ui/Button'
import { Input } from '@/ui/Input'
import { Tabs } from '@/ui/Tabs'

export type BoardSegment = 'recipe' | 'manual'

// 레시피 (포스기처럼 카테고리 → 메뉴 격자) · 매뉴얼 (바둑판 카드)
// 공용 부품은 variant="clean" (docs/08: 가로 알약 칩 · 그림자 없는 카드 · 글자 단계)
export function RecipeBoard({ segment }: { segment: BoardSegment }) {
  const { store } = useCurrentStore()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[13px] font-medium text-muted-foreground">
            {store.name}
          </span>
          <h1 className="m-0 text-[26px] leading-[1.25] font-extrabold tracking-[-0.03em]">
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
      // 카테고리 · 검색어만 바뀌는 거라 스크롤을 맨 위로 돌리지 않는다
      { replace: true, preventScrollReset: true },
    )

  const askAi = (draft: string) => navigate('/staff/chat', { state: { draft } })

  // 레시피가 하나도 없는 매장 (새 매장): 검색 · 카테고리 대신 안내
  if (recipesQuery.isSuccess && all.length === 0) {
    return (
      <EmptyGuide
        message="아직 레시피가 없어요"
        hint="메뉴가 올라오면 바로 여기서 볼 수 있어요"
        action={
          <Button size="md" onClick={() => askAi('')}>
            AI 사수에게 묻기
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <label className="relative flex items-center">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 size-5 text-subtle"
          />
          <Input
            variant="card"
            value={params.get('q') ?? ''}
            onChange={(event) => update({ q: event.target.value })}
            placeholder="메뉴, 재료 검색"
            aria-label="메뉴, 재료 검색"
            className="w-full pl-11"
          />
        </label>
        {recipesQuery.isSuccess && (
          <CategoryTabs
            variant="clean"
            categories={categories}
            value={q ? null : category}
            onChange={(c) => update({ cat: c, q: '' })}
          />
        )}
      </div>

      {recipesQuery.isPending ? (
        <RecipeSkeleton />
      ) : recipesQuery.isError ? (
        <LoadError
          what="레시피를"
          error={recipesQuery.error}
          onRetry={() => recipesQuery.refetch()}
        />
      ) : (
        <section aria-labelledby="recipe-results" className="flex flex-col gap-3">
          <SectionHeader
            id="recipe-results"
            title={
              <span className="tabular-nums">
                {q ? `"${q}" 검색 결과 ${shown.length}개` : `${category} ${shown.length}개`}
              </span>
            }
          />
          {shown.length > 0 ? (
            <RecipeGrid
              variant="clean"
              recipes={shown}
              getHref={(r) => ({
                pathname: `/staff/recipes/${r.recipeId}`,
                search: params.toString(),
              })}
            />
          ) : (
            <EmptyGuide
              message="검색 결과가 없어요"
              action={
                <Button size="md" onClick={() => askAi(q)}>
                  AI 사수에게 묻기
                </Button>
              }
            />
          )}
        </section>
      )}
    </div>
  )
}

function ManualCards({ storeId }: { storeId: string }) {
  const navigate = useNavigate()
  const manualsQuery = useManuals(storeId)

  if (manualsQuery.isPending) return <ManualSkeleton />
  if (manualsQuery.isError) {
    return (
      <LoadError
        what="매뉴얼을"
        error={manualsQuery.error}
        onRetry={() => manualsQuery.refetch()}
      />
    )
  }
  return (
    <ManualGrid
      variant="clean"
      manuals={manualsQuery.data?.manuals ?? []}
      getHref={(m) => `/staff/manuals/${m.manualId}`}
      empty={
        <EmptyGuide
          message="아직 매뉴얼이 없어요"
          hint="와이파이 · 오픈 순서 같은 매장 안내가 여기 모여요"
          action={
            <Button size="md" onClick={() => navigate('/staff/chat', { state: { draft: '' } })}>
              AI 사수에게 묻기
            </Button>
          }
        />
      }
    />
  )
}

// 로딩 뼈대: 카테고리 칩 줄 + 섹션 제목 + 레시피 카드 격자 (RecipeGrid clean 과 같은 자리 · 모서리)
function RecipeSkeleton() {
  return (
    <SkeletonGroup label="레시피를 불러오는 중" className="flex flex-col gap-6">
      {/* 칩 줄은 진짜 화면에서 검색창 바로 아래(12px)라 묶음 간격 24px 에서 12px 를 당긴다 */}
      <div className="-mt-3 flex gap-2 overflow-hidden">
        {['w-16', 'w-20', 'w-20', 'w-16'].map((w, i) => (
          <Skeleton key={i} shape="circle" className={`h-10 ${w}`} />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton shape="line" className="mx-1 my-2.5 h-4 w-24" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              className="flex flex-col overflow-hidden rounded-3xl border border-line/60 bg-card"
            >
              <Skeleton className="aspect-2/1 w-full rounded-none" />
              <span className="flex flex-col gap-2 p-3">
                <Skeleton shape="line" className="h-4 w-3/4" />
                <Skeleton shape="line" className="w-1/2" />
              </span>
            </span>
          ))}
        </div>
      </div>
    </SkeletonGroup>
  )
}

// 로딩 뼈대: 매뉴얼 카드 격자 (ManualGrid clean 과 같은 자리 · 모서리)
function ManualSkeleton() {
  return (
    <SkeletonGroup label="매뉴얼을 불러오는 중" className="grid grid-cols-2 gap-2">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="flex flex-col gap-2 rounded-3xl bg-card p-4">
          <Skeleton shape="line" className="h-4 w-3/4" />
          <Skeleton shape="line" className="w-full" />
          <Skeleton shape="line" className="w-1/2" />
        </span>
      ))}
    </SkeletonGroup>
  )
}
