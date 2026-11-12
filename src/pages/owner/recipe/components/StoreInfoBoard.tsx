import { Camera, CircleHelp, Plus, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { MANUAL_TEMPLATES, OWNER_CATEGORIES } from '@/api/mocks/owner/data'
import { useManuals } from '@/lib/api/manuals'
import { useRecipes } from '@/lib/api/recipes'
import { RecipeGuide } from '@/pages/owner/recipe/components/RecipeGuide'
import { hasSeenRecipeGuide } from '@/pages/owner/recipe/components/recipeGuideSteps'
import { useOwnerStore } from '@/pages/owner/useOwnerStore'
import { EmptyGuide } from '@/shared/EmptyGuide'
import { MANUAL_ICON } from '@/shared/icons'
import { LoadError } from '@/shared/LoadError'
import { ManualCard } from '@/shared/manual/ManualCard'
import { CategoryTabs } from '@/shared/recipe/CategoryTabs'
import { RecipeGrid } from '@/shared/recipe/RecipeGrid'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { Spinner } from '@/ui/Spinner'
import { Tabs } from '@/ui/Tabs'

// 매장 정보 탭: 레시피(포스기처럼 카테고리 → 메뉴) · 매뉴얼(카드 + 추천 템플릿)
// 보기는 알바 화면과 같은 훅(lib/api)이라 사장님이 바꾸면 알바 화면에도 그대로 보인다

export type StoreInfoSegment = 'recipe' | 'manual'

export function StoreInfoBoard({ segment }: { segment: StoreInfoSegment }) {
  const { store } = useOwnerStore()
  const navigate = useNavigate()
  // 레시피 단계별 코치마크: 레시피 탭에 처음 들어오면 한 번 자동으로 · [?] 로 다시 보기(본 기록 무시)
  // (레시피 · 매뉴얼은 주소가 달라 화면이 새로 그려지므로 처음 값으로 정한다)
  const [guideOpen, setGuideOpen] = useState(() => segment === 'recipe' && !hasSeenRecipeGuide())
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-2.5 px-1">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted-foreground">{store.name}</span>
          <h1 className="m-0 flex items-center gap-1.5 text-[28px] font-extrabold tracking-[-0.03em]">
            매장 정보
            {segment === 'recipe' && (
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                aria-label="사용 가이드 다시 보기"
                title="사용 가이드 다시 보기"
                className="flex size-8 items-center justify-center rounded-full text-subtle transition-colors hover:bg-card hover:text-foreground"
              >
                <CircleHelp className="size-5" />
              </button>
            )}
          </h1>
        </div>
        <Tabs
          options={[
            { value: 'recipe', label: '레시피' },
            { value: 'manual', label: '매뉴얼' },
          ]}
          value={segment}
          onChange={(next) => navigate(next === 'recipe' ? '/owner/recipes' : '/owner/manuals')}
        />
      </div>
      {segment === 'recipe' ? (
        <RecipeSection storeId={store.storeId} />
      ) : (
        <ManualSection storeId={store.storeId} />
      )}
      {guideOpen && segment === 'recipe' && <RecipeGuide onClose={() => setGuideOpen(false)} />}
    </div>
  )
}

function RecipeSection({ storeId }: { storeId: string }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const query = useRecipes(storeId)
  const all = query.data?.recipes ?? []

  // 사장님은 빈 카테고리도 보여야 메뉴를 넣을 수 있어서 기본 6개 + 사장님이 만든 이름
  const names = [
    ...OWNER_CATEGORIES,
    ...new Set(all.map((r) => r.category).filter((c) => !OWNER_CATEGORIES.includes(c))),
  ]
  const categories = names.map((name) => ({
    name,
    count: all.filter((r) => r.category === name).length,
  }))
  const q = (params.get('q') ?? '').trim()
  const catParam = params.get('cat')
  const category =
    catParam && names.includes(catParam)
      ? catParam
      : (query.data?.defaultCategory ?? categories.find((c) => c.count > 0)?.name ?? names[0])
  const shown = q
    ? all.filter((r) => r.name.includes(q) || r.ingredients.some((i) => i.name.includes(q)))
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
      <div className="flex h-14 items-center gap-2.5 rounded-[20px] bg-card pr-2 pl-[18px] shadow-soft">
        <Search className="size-5 shrink-0 text-subtle" />
        <input
          value={params.get('q') ?? ''}
          onChange={(event) => update({ q: event.target.value })}
          placeholder="메뉴, 재료 검색"
          aria-label="메뉴, 재료 검색"
          className="min-w-0 flex-1 border-none bg-transparent text-[15px] placeholder:text-subtle"
        />
        <Link
          to={{ pathname: '/owner/recipes/scan', search: params.toString() }}
          aria-label="사진으로 추가"
          data-guide="camera"
          className="flex size-10 shrink-0 items-center justify-center rounded-[13px] bg-foreground text-white"
        >
          <Camera className="size-5" />
        </Link>
      </div>

      {query.isPending ? (
        <Spinner />
      ) : query.error ? (
        <LoadError error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <CategoryTabs
            categories={categories}
            value={q ? null : category}
            onChange={(c) => update({ cat: c, q: '' })}
          />
          <div className="flex items-center justify-between gap-2.5 px-1">
            <h2 className="m-0 text-lg font-extrabold tracking-[-0.02em]">
              {q ? `"${q}" ${shown.length}개` : `${category} ${shown.length}개`}
            </h2>
            <Link
              to={{ pathname: '/owner/recipes/new', search: q ? '' : `cat=${category}` }}
              data-guide="add"
              className="flex items-center gap-1 rounded-full px-1.5 py-1 text-[13px] font-bold text-brand"
            >
              <Plus className="size-4" />
              추가
            </Link>
          </div>
          {shown.length > 0 ? (
            // 공용 RecipeGrid(2열)를 데스크톱에서는 3 · 4열로 (바로 안의 grid 칸 수만 바꾼다)
            <div className="lg:*:grid-cols-3 lg:*:gap-3 xl:*:grid-cols-4">
              <RecipeGrid
                recipes={shown}
                getHref={(r) => ({
                  pathname: `/owner/recipes/${r.recipeId}`,
                  search: params.toString(),
                })}
              />
            </div>
          ) : q ? (
            <EmptyState message="검색 결과가 없어요" />
          ) : (
            <EmptyGuide
              message={`아직 등록된 ${category} 메뉴가 없어요`}
              hint="등록하면 알바생 레시피 탭에 바로 보여요"
              action={
                <Button
                  size="md"
                  className="h-[46px] px-5"
                  onClick={() => navigate(`/owner/recipes/new?cat=${category}`)}
                >
                  <Plus />
                  레시피 추가
                </Button>
              }
            />
          )}
        </>
      )}
    </div>
  )
}

function ManualSection({ storeId }: { storeId: string }) {
  const query = useManuals(storeId)
  const manuals = query.data?.manuals ?? []
  const templates = MANUAL_TEMPLATES.filter((t) => !manuals.some((m) => m.title === t.title))

  if (query.isPending) return <Spinner />
  if (query.error) return <LoadError error={query.error} onRetry={() => query.refetch()} />

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-3">
      {manuals.map((m) => (
        <ManualCard key={m.manualId} manual={m} href={`/owner/manuals/${m.manualId}`} />
      ))}
      {templates.map((t) => {
        const Icon = MANUAL_ICON[t.icon]
        return (
          <DashedCard
            key={t.icon}
            to={`/owner/manuals/new?template=${t.icon}`}
            icon={<Icon className="size-5" />}
            title={t.title}
            caption="추천 템플릿"
          />
        )
      })}
      <DashedCard
        to="/owner/manuals/new"
        icon={<Plus className="size-5" />}
        title="직접 추가"
        caption="새 매뉴얼"
      />
    </div>
  )
}

/** 아직 없는 매뉴얼: 점선 카드 (누르면 예시 문구가 들어간 작성 시트) */
function DashedCard({
  to,
  icon,
  title,
  caption,
}: {
  to: string
  icon: ReactNode
  title: string
  caption: string
}) {
  return (
    <Link
      to={to}
      className="flex min-h-[170px] flex-col gap-[9px] rounded-[26px] border-[1.5px] border-dashed border-line p-4 text-[#6B7068]"
    >
      <span className="flex size-10 items-center justify-center rounded-full border-[1.5px] border-dashed border-line">
        {icon}
      </span>
      <span className="text-[17px] font-extrabold">{title}</span>
      <span className="mt-auto text-xs text-faint">{caption}</span>
    </Link>
  )
}
