import { Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useManuals } from '@/lib/api/manuals'
import { useRecipes } from '@/lib/api/recipes'
import { useCurrentStore } from '@/pages/staff/useCurrentStore'
import { EmptyGuide } from '@/shared/EmptyGuide'
import { LoadError } from '@/shared/LoadError'
import { ManualGrid } from '@/shared/manual/ManualGrid'
import { categoryCounts } from '@/shared/recipe/categories'
import { CategoryTabs } from '@/shared/recipe/CategoryTabs'
import { RecipeGrid } from '@/shared/recipe/RecipeGrid'
import { SectionHeader } from '@/shared/SectionHeader'
import { Skeleton, SkeletonGroup } from '@/shared/Skeleton'
import { Button } from '@/ui/Button'
import { Input } from '@/ui/Input'
import { Tabs } from '@/ui/Tabs'

export type BoardSegment = 'recipe' | 'manual'

// 레시피 (포스기처럼 카테고리 → 메뉴 격자) · 매뉴얼 (바둑판 카드)
// 레시피 카테고리 · 메뉴 카드는 사장님 매장 정보와 같은 모양(CategoryTabs · RecipeGrid 기본, 메뉴 카드만 스크롤 떠오르기 reveal),
// 매뉴얼은 ManualGrid variant="clean"
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

  const all = recipesQuery.data?.recipes ?? []
  // 사장님 매장 정보와 같은 줄: 기본 6개 + 그 밖의 카테고리를 늘 보여 주고 메뉴 수가 0이면 "티 0"
  const categories = categoryCounts(all)

  // 검색어는 화면 안 상태로 들고(한글 조합이 끊기지 않게), 주소(?q=)에는 따라 적기만 한다.
  // 주소 값을 입력칸에 바로 물리면 글자마다 주소가 바뀌며 다시 그려져서 "블루베리"가 "ㅂ브블…"처럼 깨진다 (11/13 나현, 민지 OK)
  const [search, setSearch] = useState(() => params.get('q') ?? '')
  const q = search.trim()
  const catParam = params.get('cat')
  // 처음 고른 칸: 메뉴가 있는 첫 카테고리 (BE 가 정한 처음 카테고리에 메뉴가 있으면 그것)
  const defaultCategory = recipesQuery.data?.defaultCategory
  const category =
    catParam && categories.some((c) => c.name === catParam)
      ? catParam
      : (categories.find((c) => c.name === defaultCategory && c.count > 0)?.name ??
        categories.find((c) => c.count > 0)?.name ??
        categories[0].name)

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
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              update({ q: event.target.value })
            }}
            placeholder="메뉴, 재료 검색"
            aria-label="메뉴, 재료 검색"
            className="w-full pl-11"
          />
        </label>
        {recipesQuery.isSuccess && (
          <CategoryTabs
            categories={categories}
            value={q ? null : category}
            onChange={(c) => {
              setSearch('')
              update({ cat: c, q: '' })
            }}
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
              reveal
              recipes={shown}
              getHref={(r) => ({
                pathname: `/staff/recipes/${r.recipeId}`,
                search: params.toString(),
              })}
            />
          ) : q ? (
            <EmptyGuide
              message="검색 결과가 없어요"
              action={
                <Button size="md" onClick={() => askAi(q)}>
                  AI 사수에게 묻기
                </Button>
              }
            />
          ) : (
            // 메뉴가 0개인 카테고리 (사장님 화면과 같은 문구)
            <EmptyGuide
              message={`아직 등록된 ${category} 메뉴가 없어요`}
              hint="메뉴가 올라오면 바로 여기서 볼 수 있어요"
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

// 로딩 뼈대: 카테고리 동그라미 줄 + 섹션 제목 + 레시피 카드 격자 (CategoryTabs · RecipeGrid 와 같은 자리 · 모서리)
function RecipeSkeleton() {
  return (
    <SkeletonGroup label="레시피를 불러오는 중" className="flex flex-col gap-6">
      {/* 카테고리 줄은 진짜 화면에서 검색창 바로 아래(12px)라 묶음 간격 24px 에서 12px 를 당긴다 */}
      <div className="-mt-3 grid grid-cols-6 gap-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="flex flex-col items-center gap-1.5 pt-2.5 pb-2">
            <Skeleton shape="circle" className="size-9" />
            <Skeleton shape="line" className="w-10" />
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton shape="line" className="mx-1 my-2.5 h-4 w-24" />
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[1.6] w-full rounded-[22px]" />
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
