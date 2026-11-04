import { Camera, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toastApiError } from '@/lib/api/errors'
import { useCreateRecipe, useScanRecipe } from '@/pages/owner/api/content'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { toast } from '@/ui/toastStore'

// 사진으로 레시피 추가 (P1, docs/03 S3): 사진 → AI 초안 → 읽지 못한 칸(노란색)을 채우고 공개
// 사장님이 [공개]해야 알바생 화면에 보인다

type Draft = Awaited<ReturnType<ReturnType<typeof useScanRecipe>['mutateAsync']>>

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
  const [draft, setDraft] = useState<Draft | null>(null)
  /** AI 가 읽지 못한 재료 칸 (노란색 입력) */
  const [blanks, setBlanks] = useState<number[]>([])
  const scan = useScanRecipe()
  const create = useCreateRecipe(storeId)

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo)), [photo])

  const read = (file: File) => {
    setPhoto(URL.createObjectURL(file))
    scan.mutate(undefined, {
      onSuccess: (result) => {
        setDraft(result)
        setBlanks(result.ingredients.flatMap((ing, i) => (ing.amount ? [] : [i])))
      },
      onError: (error) => {
        setPhoto(null)
        toastApiError(error, '사진을 읽지 못했어요. 다시 시도해 주세요')
      },
    })
  }

  const missing = draft?.ingredients.some((i) => !i.amount?.trim()) ?? true

  const publish = () => {
    if (!draft) return
    create.mutate(
      {
        name: draft.name,
        category: draft.category,
        temp: draft.temp,
        size: draft.size,
        ingredients: draft.ingredients.map((i) => ({ name: i.name, amount: i.amount ?? '' })),
        steps: draft.steps,
        memo: null,
      },
      {
        onSuccess: ({ recipeId }) => {
          toast('공개했어요. 알바생 화면에 보여요')
          onSaved(recipeId, draft.category)
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
                accept="image/*"
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

        {draft && (
          <div className="flex flex-col gap-3">
            <span className="text-[13px] text-[#6B7068]">
              AI 초안 · 노란 칸은 직접 입력해 주세요
            </span>
            <dl className="m-0 flex flex-col rounded-[22px] bg-white px-[18px] py-1">
              <Row label="메뉴" value={draft.name} />
              <Row label="카테고리" value={draft.category} />
              {draft.ingredients.map((ing, i) => (
                <div
                  key={ing.name}
                  className="flex items-center justify-between gap-2.5 border-b border-[#F0EBE2] py-2 text-[15px] last:border-b-0"
                >
                  <dt className="text-[#6B7068]">{ing.name}</dt>
                  <dd className="m-0">
                    {blanks.includes(i) ? (
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[#F0EBE2] py-[13px] text-[15px]">
      <dt className="text-[#6B7068]">{label}</dt>
      <dd className="m-0 font-bold">{value}</dd>
    </div>
  )
}
