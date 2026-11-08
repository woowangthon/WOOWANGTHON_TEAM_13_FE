import { Plus, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { OWNER_CATEGORIES, RECIPE_TEMPLATES } from '@/api/mocks/owner/data'
import { toastApiError } from '@/lib/api/errors'
import type { Recipe, RecipeTemp } from '@/lib/api/types'
import {
  canSaveRecipePhoto,
  useCreateRecipe,
  useRecipePhotos,
  useUpdateRecipe,
} from '@/pages/owner/api/content'
import type { RecipeInput } from '@/pages/owner/api/types'
import { RecipePhotoField } from '@/pages/owner/recipe/components/RecipePhotoField'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { Chip } from '@/ui/Chip'
import { Input } from '@/ui/Input'
import { Textarea } from '@/ui/Textarea'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 레시피 추가 · 수정 (docs/03 S3): 템플릿 → 메뉴 사진 · 이름 · 카테고리 · 재료와 양 · 순서 · 메모

type Row = { name: string; amount: string }

const TEMPS: { value: RecipeTemp; label: string }[] = [
  { value: 'ICE', label: 'ICE' },
  { value: 'HOT', label: 'HOT' },
  { value: 'DESSERT', label: '디저트' },
]

interface RecipeFormSheetProps {
  storeId: string
  /** 수정이면 원래 레시피 */
  recipe?: Recipe
  /** 추가할 때 고를 카테고리 (목록에서 보던 카테고리) */
  initialCategory?: string
  onClose: () => void
  onSaved: (recipeId: string, category: string) => void
}

export function RecipeFormSheet({
  storeId,
  recipe,
  initialCategory,
  onClose,
  onSaved,
}: RecipeFormSheetProps) {
  const editing = !!recipe
  const [template, setTemplate] = useState<string | null>(null)
  const [name, setName] = useState(recipe?.name ?? '')
  const [category, setCategory] = useState(recipe?.category ?? initialCategory ?? '커피')
  const [temp, setTemp] = useState<RecipeTemp>(recipe?.temp ?? 'ICE')
  const [size, setSize] = useState(recipe?.size ?? '16oz')
  const [rows, setRows] = useState<Row[]>(
    recipe?.ingredients.map((i) => ({ ...i })) ?? [{ name: '', amount: '' }],
  )
  const [steps, setSteps] = useState(recipe?.steps.join('\n') ?? '')
  const [memo, setMemo] = useState(recipe?.memo ?? '')
  const [photo, setPhoto] = useState<File | null | undefined>(undefined)
  const photos = useRecipePhotos(storeId)
  const currentPhoto = recipe ? (photos.data?.[recipe.recipeId] ?? null) : null
  const create = useCreateRecipe(storeId)
  const update = useUpdateRecipe(storeId)
  const pending = create.isPending || update.isPending

  const pickTemplate = (key: string) => {
    const t = RECIPE_TEMPLATES[key]
    setTemplate(key)
    setCategory(t.category)
    setRows(t.ingredients.map((n) => ({ name: n, amount: '' })))
    // 메뉴 이름 템플릿(아메리카노 · 카페라떼 · 바닐라라떼)만 이름까지 채운다
    if (!name.trim() && !['에이드', '스무디', '티'].includes(key)) setName(key)
  }
  const setRow = (index: number, patch: Partial<Row>) =>
    setRows((list) => list.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  const save = () => {
    const input: RecipeInput = {
      name,
      category,
      temp,
      size: size.trim() || '-',
      ingredients: rows.filter((r) => r.name.trim()),
      steps: steps.split('\n'),
      memo: memo.trim() || null,
      photo,
    }
    const done = (recipeId: string) => {
      toast('저장했어요')
      onSaved(recipeId, category)
    }
    const onError = (error: unknown) =>
      toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', save)
    if (recipe) {
      update.mutate(
        { recipeId: recipe.recipeId, input },
        { onSuccess: ({ recipeId }) => done(recipeId), onError },
      )
    } else {
      create.mutate(input, { onSuccess: ({ recipeId }) => done(recipeId), onError })
    }
  }

  return (
    <BottomSheet open onClose={onClose} label={editing ? '레시피 수정' : '레시피 추가'} closeButton>
      <div className="flex flex-col gap-4">
        <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">
          {editing ? '레시피 수정' : '레시피 추가'}
        </h2>

        {!editing && (
          <Field label="템플릿">
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(RECIPE_TEMPLATES).map((key) => (
                <Chip
                  key={key}
                  active={template === key}
                  onClick={() => pickTemplate(key)}
                  className={cn(
                    'border px-3.5 py-2',
                    template === key ? 'border-brand' : 'border-muted',
                  )}
                >
                  {key}
                </Chip>
              ))}
            </div>
          </Field>
        )}

        {canSaveRecipePhoto() && (
          <RecipePhotoField currentUrl={currentPhoto} value={photo} onChange={setPhoto} />
        )}

        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="메뉴 이름"
          aria-label="메뉴 이름"
          className="h-[54px] px-[18px] text-base"
        />

        <Field label="카테고리">
          <div className="flex flex-wrap gap-1.5">
            {OWNER_CATEGORIES.map((c) => (
              <Chip
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
                className={cn(
                  'border px-3.5 py-2',
                  category === c ? 'border-brand' : 'border-muted',
                )}
              >
                {c}
              </Chip>
            ))}
          </div>
        </Field>

        <div className="flex gap-2">
          <div
            className="flex flex-1 gap-1 rounded-full bg-muted p-1"
            role="radiogroup"
            aria-label="온도"
          >
            {TEMPS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={temp === t.value}
                onClick={() => setTemp(t.value)}
                className={cn(
                  'h-10 flex-1 rounded-full text-[13px] font-bold',
                  temp === t.value ? 'bg-brand text-white' : 'text-[#6B7068]',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Input
            value={size}
            onChange={(event) => setSize(event.target.value)}
            aria-label="사이즈"
            placeholder="16oz"
            className="h-12 w-24 text-center"
          />
        </div>

        <Field label="재료">
          {rows.map((row, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-[18px] bg-white py-1.5 pr-1.5 pl-4"
            >
              <input
                value={row.name}
                onChange={(event) => setRow(i, { name: event.target.value })}
                placeholder="재료"
                aria-label={`재료 ${i + 1}`}
                className="min-w-0 flex-1 border-none bg-transparent text-sm text-[#4F554D] placeholder:text-faint"
              />
              <input
                value={row.amount}
                onChange={(event) => setRow(i, { amount: event.target.value })}
                placeholder="양"
                aria-label={`재료 ${i + 1} 양`}
                className="h-10 w-[110px] rounded-xl border-none bg-background px-3 text-sm placeholder:text-faint"
              />
              <button
                type="button"
                aria-label={`재료 ${i + 1} 빼기`}
                onClick={() => setRows((list) => list.filter((_, j) => j !== i))}
                className="flex size-8 items-center justify-center rounded-full text-faint"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((list) => [...list, { name: '', amount: '' }])}
            className="flex h-11 items-center justify-center gap-1 rounded-[18px] border-[1.5px] border-dashed border-line text-[13px] font-bold text-[#6B7068]"
          >
            <Plus className="size-4" />
            재료 추가
          </button>
        </Field>

        <Field label="만드는 순서 (한 줄에 하나씩)">
          <Textarea
            value={steps}
            onChange={(event) => setSteps(event.target.value)}
            placeholder={'얼음을 가득 담아요\n샷 2개를 올려요'}
            aria-label="만드는 순서"
            className="min-h-[96px]"
          />
        </Field>

        <Input
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="메모 (선택) 예) 딸기청은 매일 아침 확인"
          aria-label="메모"
        />

        <Button className="h-[54px]" disabled={!name.trim() || pending} onClick={save}>
          저장
        </Button>
      </div>
    </BottomSheet>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-bold text-[#6B7068]">{label}</span>
      {children}
    </div>
  )
}
