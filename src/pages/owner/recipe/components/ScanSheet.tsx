import { Camera, ChevronLeft, ChevronRight, Crop, Images, Sparkles } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { toastApiError } from '@/lib/api/errors'
import type { RecipeTemp } from '@/lib/api/types'
import { ApiError } from '@/lib/apiClient'
import { useCreateRecipe, useScanRecipe } from '@/pages/owner/api/content'
import type { RecipeScanDraft } from '@/pages/owner/api/types'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { ImageCropper } from '@/ui/ImageCropper'
import { toast } from '@/ui/toastStore'
import { cn } from '@/ui/utils'

// 사진으로 레시피 추가 (P1, docs/03 S3): 사진 → AI 초안 → 읽지 못한 칸(노란색)을 채우고 공개
// 메뉴마다 사진을 찍어 초안을 쌓고(다음 메뉴 찍기), 넘겨 가며 고친 뒤 한 번에 공개한다
// BE 는 사진에서 맨 위 레시피 하나만 읽는다 (여러 개면 hasMoreRecipes) → 다음 메뉴만 보이게 다시 찍는다
// 사진 찍기 · 갤러리(파일)에서 고르기 → 자르기(ImageCropper)로 읽을 부분만 남긴 뒤 보낸다
// 한 장에 레시피가 여러 개면 [같은 사진에서 다음 메뉴 자르기]로 마지막에 고른 원본을 다시 자른다 — 매번 새로 찍지 않게 (QA 11/15)

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

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

/** 찍은 메뉴 하나 */
interface ScanItem {
  key: number
  draft: RecipeScanDraft
  blanks: Blanks
}

const blanksOf = (draft: RecipeScanDraft): Blanks => ({
  name: !draft.name.trim(),
  category: !draft.category?.trim(),
  temp: !draft.temp,
  ingredients: draft.ingredients.flatMap((ing, i) => (ing.amount?.trim() ? [] : [i])),
})

const isComplete = (d: RecipeScanDraft) =>
  !!d.name.trim() &&
  !!d.category?.trim() &&
  !!d.temp &&
  d.ingredients.every((i) => i.amount?.trim())

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
  /** 고르고 아직 자르지 않은 사진 */
  const [picked, setPicked] = useState<File | null>(null)
  /** 마지막으로 찍거나 고른 원본 (같은 사진에서 다음 메뉴를 다시 자른다) */
  const [source, setSource] = useState<File | null>(null)
  const [items, setItems] = useState<ScanItem[]>([])
  const [page, setPage] = useState(0)
  /** 메뉴가 있어도 사진 찍는 칸을 보여 줄지 (다음 메뉴 찍기) */
  const [adding, setAdding] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const scan = useScanRecipe(storeId)
  const create = useCreateRecipe(storeId)

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo)), [photo])

  const current = items[Math.min(page, items.length - 1)]

  const pickNew = (file: File) => {
    setSource(file)
    setPicked(file)
  }

  const cropAgain = () => {
    if (!source) return
    setAdding(true)
    setPicked(source)
  }
  const picking = items.length === 0 || adding

  const read = (file: File) => {
    setPicked(null)
    setPhoto(URL.createObjectURL(file))
    scan.mutate(file, {
      onSuccess: (draft) => {
        setItems((list) => [...list, { key: Date.now(), draft, blanks: blanksOf(draft) }])
        setPage(items.length)
        setAdding(false)
        setPhoto(null)
      },
      onError: (error) => {
        setPhoto(null)
        const known = error instanceof ApiError ? SCAN_ERROR[error.status] : undefined
        if (known) toast.error(known)
        else toastApiError(error, '사진을 읽지 못했어요. 다시 시도해 주세요')
      },
    })
  }

  const setDraft = (draft: RecipeScanDraft) =>
    setItems((list) => list.map((item) => (item.key === current.key ? { ...item, draft } : item)))

  const removeCurrent = () => {
    setItems((list) => list.filter((item) => item.key !== current.key))
    setPage((p) => Math.max(0, Math.min(p, items.length - 2)))
  }

  // 차례로 등록한다. 성공한 메뉴는 목록에서 빼고, 실패하면 남은 메뉴로 다시 시도할 수 있다
  const publishAll = async () => {
    const incomplete = items.findIndex((item) => !isComplete(item.draft))
    if (incomplete >= 0) {
      setPage(incomplete)
      toast.error(`${incomplete + 1}번째 메뉴의 노란 칸을 채워 주세요`)
      return
    }
    setPublishing(true)
    const done: { recipeId: string; category: string }[] = []
    let failed: unknown = null
    const left: ScanItem[] = []
    for (const item of items) {
      const { draft } = item
      const category = draft.category!.trim()
      if (failed) {
        left.push(item)
        continue
      }
      try {
        const { recipeId } = await create.mutateAsync({
          name: draft.name.trim(),
          category,
          temp: draft.temp!,
          size: draft.size ?? '',
          ingredients: draft.ingredients.map((i) => ({ name: i.name, amount: i.amount ?? '' })),
          steps: draft.steps,
          memo: null,
        })
        done.push({ recipeId, category })
      } catch (error) {
        failed = error
        left.push(item)
      }
    }
    setPublishing(false)
    if (failed) {
      setItems(left)
      setPage(0)
      if (done.length) toast(`${done.length}개는 공개했어요`)
      toastApiError(failed, '공개하지 못했어요. 다시 시도해 주세요', publishAll)
      return
    }
    toast(`${done.length}개를 공개했어요. 알바생 화면에 보여요`)
    onSaved(done[0].recipeId, done[0].category)
  }

  return (
    <BottomSheet open onClose={onClose} label="사진으로 추가" closeButton>
      <div className="flex flex-col gap-4">
        <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">
          사진으로 추가
          {items.length > 0 && (
            <span className="ml-2 text-base font-bold text-muted-foreground">
              메뉴 {items.length}개
            </span>
          )}
        </h2>

        {picking && (
          <div className="flex flex-col gap-3.5">
            {items.length > 0 && !picked && (
              <span className="text-[13px] text-muted-foreground">
                {source
                  ? '같은 사진에서 다음 메뉴를 자르거나 새로 찍어 주세요 (사진에 레시피가 여러 개면 맨 위 하나만 읽어요)'
                  : '다음 메뉴만 보이게 찍어 주세요 (사진에 레시피가 여러 개면 맨 위 하나만 읽어요)'}
              </span>
            )}
            {photo ? (
              <div className="relative h-[190px] overflow-hidden rounded-[22px] bg-white">
                <img
                  src={photo}
                  alt="레시피 사진"
                  className="absolute inset-0 size-full object-cover"
                />
              </div>
            ) : picked ? (
              <ImageCropper
                file={picked}
                hint={
                  items.length > 0 && picked === source
                    ? '다음에 읽을 레시피 부분만 남겨 주세요'
                    : '읽을 레시피 부분만 남겨 주세요. 그대로 두면 사진 전체를 읽어요'
                }
                confirmLabel="읽기"
                onCancel={() => setPicked(null)}
                onConfirm={read}
              />
            ) : (
              <>
                {items.length > 0 && source && (
                  <Button variant="soft" className="h-[54px]" onClick={cropAgain}>
                    <Crop />
                    같은 사진에서 다음 메뉴 자르기
                  </Button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <PickButton
                    icon={<Camera className="size-7" />}
                    label={items.length > 0 ? '다음 메뉴 찍기' : '사진 찍기'}
                    capture
                    onPick={pickNew}
                  />
                  <PickButton
                    icon={<Images className="size-7" />}
                    label="갤러리 · 파일"
                    onPick={pickNew}
                  />
                </div>
              </>
            )}
            {scan.isPending && (
              <div className="flex items-center gap-2 rounded-[18px] bg-warm px-4 py-3.5 text-[15px] font-medium text-warm-foreground">
                <Sparkles className="size-[18px]" />
                읽고 있어요…
              </div>
            )}
            {items.length > 0 && !scan.isPending && !picked && (
              <Button variant="soft" onClick={() => setAdding(false)}>
                취소
              </Button>
            )}
          </div>
        )}

        {!picking && current && (
          <div className="flex flex-col gap-3">
            {items.length > 1 && (
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="이전 메뉴"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="flex size-9 items-center justify-center rounded-full bg-white disabled:opacity-40"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <span className="text-[15px] font-bold">
                  {page + 1} / {items.length}
                </span>
                <button
                  type="button"
                  aria-label="다음 메뉴"
                  disabled={page === items.length - 1}
                  onClick={() => setPage(page + 1)}
                  className="flex size-9 items-center justify-center rounded-full bg-white disabled:opacity-40"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            )}

            {current.draft.hasMoreRecipes && (
              <div className="rounded-[18px] bg-warm px-4 py-3 text-[13px] font-medium text-warm-foreground">
                사진에 레시피가 여러 개 있어서 맨 위 메뉴만 읽었어요. 나머지는 [같은 사진에서 다음
                메뉴 자르기]로 한 메뉴씩 골라 주세요
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">
                AI 초안 · 노란 칸은 직접 입력해 주세요
              </span>
              <button
                type="button"
                onClick={removeCurrent}
                className="p-0 text-[13px] font-medium text-destructive-foreground"
              >
                빼기
              </button>
            </div>
            <DraftFields key={current.key} item={current} onChange={setDraft} />

            {source && (
              <Button variant="soft" className="h-[54px]" disabled={publishing} onClick={cropAgain}>
                <Crop />
                같은 사진에서 다음 메뉴 자르기
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="soft"
                className="h-[54px]"
                disabled={publishing}
                onClick={() => setAdding(true)}
              >
                다음 메뉴 찍기
              </Button>
              <Button className="h-[54px]" disabled={publishing} onClick={publishAll}>
                {items.length > 1 ? `모두 공개 (${items.length})` : '공개'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

/** 사진 고르기 칸 하나 (capture 면 폰에서 바로 카메라가 열린다) */
function PickButton({
  icon,
  label,
  capture,
  onPick,
}: {
  icon: ReactNode
  label: string
  capture?: boolean
  onPick: (file: File) => void
}) {
  return (
    <label className="flex h-[150px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] border-[1.5px] border-dashed border-line bg-white text-muted-foreground">
      {icon}
      <span className="text-[15px] font-medium">{label}</span>
      <input
        type="file"
        accept={ACCEPT}
        capture={capture ? 'environment' : undefined}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onPick(file)
        }}
      />
    </label>
  )
}

/** 초안 한 개: 메뉴 · 카테고리 · 온도 · 재료 (못 읽은 칸은 노란 입력) */
function DraftFields({
  item,
  onChange,
}: {
  item: ScanItem
  onChange: (draft: RecipeScanDraft) => void
}) {
  const { draft, blanks } = item
  return (
    <dl className="m-0 flex flex-col rounded-[22px] bg-white px-[18px] py-1">
      <Row
        label="메뉴"
        value={draft.name}
        blank={blanks.name}
        onChange={(name) => onChange({ ...draft, name })}
      />
      <Row
        label="카테고리"
        value={draft.category ?? ''}
        blank={blanks.category}
        onChange={(category) => onChange({ ...draft, category })}
      />
      {blanks.temp && (
        <div className="flex items-center justify-between gap-2.5 border-b border-border py-2 text-[15px]">
          <dt className="text-muted-foreground">온도</dt>
          <dd className="m-0 flex gap-1" role="radiogroup" aria-label="온도">
            {TEMPS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={draft.temp === t.value}
                onClick={() => onChange({ ...draft, temp: t.value })}
                className={cn(
                  'h-[38px] rounded-xl px-3 text-[13px] font-bold',
                  draft.temp === t.value
                    ? 'bg-brand text-white'
                    : 'border-[1.5px] border-new bg-warm',
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
          key={`${ing.name}-${i}`}
          className="flex items-center justify-between gap-2.5 border-b border-border py-2 text-[15px] last:border-b-0"
        >
          <dt className="text-muted-foreground">{ing.name}</dt>
          <dd className="m-0">
            {blanks.ingredients.includes(i) ? (
              <input
                value={ing.amount ?? ''}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    ingredients: draft.ingredients.map((x, j) =>
                      j === i ? { ...x, amount: event.target.value } : x,
                    ),
                  })
                }
                placeholder="입력"
                aria-label={`${ing.name} 양`}
                className="h-[38px] w-[120px] rounded-xl border-[1.5px] border-new bg-warm px-2.5 text-[15px]"
              />
            ) : (
              <span className="font-bold">{ing.amount}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
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
      <div className="flex items-center justify-between gap-2.5 border-b border-border py-2 text-[15px]">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className="m-0">
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="입력"
            aria-label={label}
            className="h-[38px] w-[160px] rounded-xl border-[1.5px] border-new bg-warm px-2.5 text-[15px]"
          />
        </dd>
      </div>
    )
  }
  return (
    <div className="flex justify-between border-b border-border py-[13px] text-[15px]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 font-bold">{value}</dd>
    </div>
  )
}
