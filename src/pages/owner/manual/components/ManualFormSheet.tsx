import { Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { ApiError } from '@/lib/apiClient'
import { toastApiError } from '@/lib/api/errors'
import type { Manual, ManualIcon } from '@/lib/api/types'
import { useCreateManual, useDeleteManual, useUpdateManual } from '@/pages/owner/api/content'
import { BottomSheet } from '@/ui/BottomSheet'
import { Button } from '@/ui/Button'
import { Input } from '@/ui/Input'
import { Textarea } from '@/ui/Textarea'
import { toast } from '@/ui/toastStore'

// 매뉴얼 작성 · 수정 · 삭제 (docs/03 S2). 템플릿이면 예시 문구가 플레이스홀더로 보인다
// 직접 추가 · 수정은 물건 이름과 위치를 함께 적는 예시 + 안내 (AI 사수가 물건 이름으로 찾기 쉬워서, 11/10 회의)

const FREE_TITLE_HINT = '제목 예) 우산 빌려주기'
const FREE_BODY_HINT =
  '예) 여분 우산은 창고 선반 두 번째 칸에 있어요. 빌려 가는 손님은 메모지에 이름 · 연락처를 적어 주세요'
interface ManualFormSheetProps {
  storeId: string
  /** 수정이면 원래 매뉴얼 */
  manual?: Manual
  /** 템플릿으로 새로 쓸 때 */
  template?: { icon: ManualIcon; title: string; hint: string }
  onClose: () => void
  onDone: () => void
}

export function ManualFormSheet({
  storeId,
  manual,
  template,
  onClose,
  onDone,
}: ManualFormSheetProps) {
  const editing = !!manual
  const [title, setTitle] = useState(manual?.title ?? template?.title ?? '')
  const [body, setBody] = useState(manual?.body ?? '')
  const [duplicate, setDuplicate] = useState(false)
  const [askDelete, setAskDelete] = useState(false)
  const create = useCreateManual(storeId)
  const update = useUpdateManual(storeId)
  const remove = useDeleteManual(storeId)
  const pending = create.isPending || update.isPending
  const ok = title.trim() && body.trim()

  const save = () => {
    const input = { title, body, icon: manual?.icon ?? template?.icon ?? null }
    const options = {
      onSuccess: () => {
        toast('저장했어요')
        onDone()
      },
      onError: (error: unknown) => {
        if (error instanceof ApiError && error.code === 'MANUAL_TITLE_EXISTS') {
          return setDuplicate(true)
        }
        toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', save)
      },
    }
    if (manual) update.mutate({ manualId: manual.manualId, input }, options)
    else create.mutate(input, options)
  }

  const del = () =>
    manual &&
    remove.mutate(manual.manualId, {
      onSuccess: () => {
        toast('삭제했어요')
        onDone()
      },
      onError: (error) => toastApiError(error, '삭제하지 못했어요. 다시 시도해 주세요', del),
    })

  return (
    <BottomSheet open onClose={onClose} label={editing ? '매뉴얼 수정' : '매뉴얼 작성'} closeButton>
      <div className="flex flex-col gap-3.5">
        <h2 className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">
          {editing ? '매뉴얼 수정' : '매뉴얼 작성'}
        </h2>
        <Input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            setDuplicate(false)
          }}
          placeholder={template ? '제목' : FREE_TITLE_HINT}
          aria-label="제목"
          className="h-[54px] px-[18px] text-base font-medium"
        />
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={template?.hint ?? FREE_BODY_HINT}
          aria-label="내용"
          className="min-h-[140px] px-[18px]"
        />
        {!template && (
          <span className="flex items-start gap-1.5 px-1 text-xs leading-normal text-muted-foreground">
            <Lightbulb className="mt-px size-3.5 shrink-0" />
            물건 이름과 위치를 함께 적으면 AI 사수가 더 잘 찾아요
          </span>
        )}
        {duplicate && (
          <span role="alert" className="text-[13px] text-destructive-foreground">
            이미 있는 제목이에요
          </span>
        )}
        {askDelete && (
          <div className="flex flex-col gap-2.5 rounded-[18px] bg-destructive-soft p-3.5">
            <span className="text-[15px] text-destructive-foreground">
              알바생 화면과 AI 사수 답변에서도 사라져요.
            </span>
            <Button
              variant="danger"
              size="md"
              className="h-[46px]"
              disabled={remove.isPending}
              onClick={del}
            >
              삭제
            </Button>
          </div>
        )}
        <div className={editing ? 'grid grid-cols-[1fr_2fr] gap-2' : 'grid'}>
          {editing && (
            <Button
              variant="soft"
              className="text-destructive-foreground"
              onClick={() => setAskDelete(true)}
            >
              삭제
            </Button>
          )}
          <Button disabled={!ok || pending} onClick={save}>
            저장
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
