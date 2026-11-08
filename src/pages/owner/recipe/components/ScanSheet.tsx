import { Camera, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toastApiError } from '@/lib/api/errors'
import type { RecipeTemp } from '@/lib/api/types'
import { ApiError } from '@/lib/apiClient'
import { useCreateRecipe, useScanRecipe } from '@/pages/owner/api/content'
import type { RecipeScanDraft } from '@/pages/owner/api/types'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 사진으로 레시피 추가 (P1, docs/03 S3): 사진 → AI 초안 → 읽지 못한 칸(노란색)을 채우고 공개
// 사장님이 [공개]해야 알바생 화면에 보인다. 메뉴 · 카테고리 · 온도도 못 읽으면 노란 칸으로 받는다

const TEMPS: { value: RecipeTemp; label: string }[] = [
  { value: 'ICE', label: 'ICE' },
  { value: 'HOT', label: 'HOT' },
  { value: 'DESSERT', label: '디저트' },
]

// BE 스캔 오류는 영어 문장이라 상태별로 화면 문구를 고른다
const SCAN_ERROR: Record<number, string> = {
  413: '10MB 이하 사진으로 다시 올려 주세요',
  415: 'JPG · PNG · WebP · HEIC 사진만 읽을 수 있어요',
  422: '레시피를 읽지 못했어요. 레시피가 잘 보이게 다시 찍어 주세요',
  503: 'AI가 잠시 바빠요. 잠시 뒤 다시 시도해 주세요',
}

/** 처음 초안에서 비어 있던 칸 (노란 입력으로 받는다) */
interface Blanks {
  name: boolean
  category: boolean
  temp: boolean
  ingredients: number[]
}

export function ScanSheet({
  storeId,
  onClose,
  onSaved,
}: {
  storeId: string
  onClose: () => void
  onSaved: (recipeId: string, category: string) => void
}) {
  const [photo, setPhoto] = useState<string | null>(null)
  const [draft, setDraft] = useState<RecipeScanDraft | null>(null)
  const [blanks, setBlanks] = useState<Blanks | null>(null)
  const scan = useScanRecipe(storeId)
  const create = useCreateRecipe(storeId)

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo)), [photo])

  const read = (file: File) => {
    setPhoto(URL.createObjectURL(file))
    scan.mutate(file, {
      onSuccess: (result) => {
        setDraft(result)
        setBlanks({
          name: !result.name.trim(),
          category: !result.category?.trim(),
          temp: !result.temp,
          ingredients: result.ingredients.flatMap((ing, i) => (ing.amount?.trim() ? [] : [i])),
        })
      },
      onError: (error) => {
        setPhoto(null)
        const known = error instanceof ApiError ? SCAN_ERROR[error.status] : undefined
        if (known) toast.error(known)
        else toastApiError(error, '사진을 읽지 못했어요. 다시 시도해 주세요')
      },
    })
  }

  const missing =
    !draft ||
    !draft.name.trim() ||
    !draft.category?.trim() ||
    !draft.temp ||
    draft.ingredients.some((i) => !i.amount?.trim())

  const publish = () => {
    if (!draft?.category || !draft.temp) return
    const category = draft.category.trim()
    create.mutate(
      {
        name: draft.name.trim(),
        category,
        temp: draft.temp,
        size: draft.size ?? '',
        ingredients: draft.ingredients.map((i) => ({ name: i.name, amount: i.amount ?? '' })),
        steps: draft.steps,
        memo: null,
      },
      {
        onSuccess: ({ recipeId }) => {
          toast('공개했어요. 알바생 화면에 보여요')
          onSaved(recipeId, category)
        },
        onError: (error) => toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', publish),
      },
    )
  }

  return (
    <BottomSheet open onClose={onClose} label="사진으로 추가" closeButton>
      <div className="flex flex-col gap-4">
        <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">사진으로 추가</h2>

        {!draft && (
          <div className="flex flex-col gap-3.5">
            <label className="relative flex h-[190px] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[22px] border-[1.5px] border-dashed border-line bg-white text-[#6B7068]">
              {photo ? (
                <img
                  src={photo}
                  alt="레시피 사진"
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <>
                  <Camera className="size-7" />
                  <span className="text-sm font-semibold">레시피 사진 찍기 · 고르기</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                capture="environment"
                className="sr-only"
                disabled={scan.isPending}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) read(file)
                }}
              />
            </label>
            {scan.isPending && (
              <div className="flex items-center gap-2 rounded-[18px] bg-warm px-4 py-3.5 text-sm font-semibold text-warm-foreground">
                <Sparkles className="size-[18px]" />
                읽고 있어요…
              </div>
            )}
          </div>
        )}

        {draft && blanks && (
          <div className="flex flex-col gap-3">
            <span className="text-[13px] text-[#6B7068]">
              AI 초안 · 노란 칸은 직접 입력해 주세요
            </span>
            <dl className="m-0 flex flex-col rounded-[22px] bg-white px-[18px] py-1">
              <Row
                label="메뉴"
                value={draft.name}
                blank={blanks.name}
                onChange={(name) => setDraft({ ...draft, name })}
              />
              <Row
                label="카테고리"
                value={draft.category ?? ''}
                blank={blanks.category}
                onChange={(category) => setDraft({ ...draft, category })}
              />
              {blanks.temp && (
                <div className="flex items-center justify-between gap-2.5 border-b border-[#F0EBE2] py-2 text-[15px]">
                  <dt className="text-[#6B7068]">온도</dt>
                  <dd className="m-0 flex gap-1" role="radiogroup" aria-label="온도">
                    {TEMPS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        role="radio"
                        aria-checked={draft.temp === t.value}
                        onClick={() => setDraft({ ...draft, temp: t.value })}
                        className={cn(
                          'h-[38px] rounded-xl px-3 text-[13px] font-bold',
                          draft.temp === t.value
                            ? 'bg-brand text-white'
                            : 'border-[1.5px] border-[#E8C66A] bg-[#FFF6D9]',
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </dd>
                </div>
              )}
              {draft.ingredients.map((ing, i) => (
                <div
                  key={ing.name}
                  className="flex items-center justify-between gap-2.5 border-b border-[#F0EBE2] py-2 text-[15px] last:border-b-0"
                >
                  <dt className="text-[#6B7068]">{ing.name}</dt>
                  <dd className="m-0">
                    {blanks.ingredients.includes(i) ? (
                      <input
                        value={ing.amount ?? ''}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            ingredients: draft.ingredients.map((x, j) =>
                              j === i ? { ...x, amount: event.target.value } : x,
                            ),
                          })
                        }
                        placeholder="입력"
                        aria-label={`${ing.name} 양`}
                        className="h-[38px] w-[120px] rounded-xl border-[1.5px] border-[#E8C66A] bg-[#FFF6D9] px-2.5 text-sm"
                      />
                    ) : (
                      <span className="font-bold">{ing.amount}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <Button className="h-[54px]" disabled={missing || create.isPending} onClick={publish}>
              공개
            </Button>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

function Row({
  label,
  value,
  blank,
  onChange,
}: {
  label: string
  value: string
  /** AI 가 못 읽었으면 노란 입력 칸 */
  blank: boolean
  onChange: (value: string) => void
}) {
  if (blank) {
    return (
      <div className="flex items-center justify-between gap-2.5 border-b border-[#F0EBE2] py-2 text-[15px]">
        <dt className="text-[#6B7068]">{label}</dt>
        <dd className="m-0">
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="입력"
            aria-label={label}
            className="h-[38px] w-[160px] rounded-xl border-[1.5px] border-[#E8C66A] bg-[#FFF6D9] px-2.5 text-sm"
          />
        </dd>
      </div>
    )
  }
  return (
    <div className="flex justify-between border-b border-[#F0EBE2] py-[13px] text-[15px]">
      <dt className="text-[#6B7068]">{label}</dt>
      <dd className="m-0 font-bold">{value}</dd>
    </div>
  )
}
