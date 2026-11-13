import { useRef } from 'react'
import { toastApiError } from '@/lib/api/errors'
import { useCreateHandoverNote, useHandoverDraft } from '@/lib/api/handover'
import type { NewHandoverNote } from '@/lib/api/types'
import { formatDate } from '@/lib/format'
import { HandoverWriteForm } from '@/shared/handover/HandoverWriteForm'
import { BottomSheet } from '@/ui/BottomSheet'
import { toast } from '@/ui/toastStore'

const NO_ISSUE: NewHandoverNote = { rawText: '', noIssue: true, summary: '', items: [] }

// 사장님 인수인계 남기기: 알바 시트와 같은 작성 폼(shared/handover/HandoverWriteForm · lib/api/handover)
// BE 는 사장님도 쓸 수 있다 (ensure_member). 저장하면 알바생 홈 · 인수인계 목록에 보인다
// 모양은 알바 시트와 같은 메모지 카드(variant note · 위에 날짜 · 매장, 11/14)
export function OwnerHandoverWriteSheet({
  storeId,
  storeName,
  today,
  onClose,
}: {
  storeId: string
  storeName: string
  today: Date
  onClose: () => void
}) {
  const draft = useHandoverDraft(storeId)
  const create = useCreateHandoverNote(storeId)

  /** 저장 중 (폼의 [저장] · [특이사항 없음]을 빨리 두 번 눌러도 한 번만 저장) */
  const saving = useRef(false)

  const save = (note: NewHandoverNote, doneMessage: string) => {
    if (saving.current) return
    saving.current = true
    create.mutate(note, {
      onSuccess: () => {
        onClose()
        toast(doneMessage)
      },
      onError: (error) =>
        toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', () =>
          save(note, doneMessage),
        ),
      onSettled: () => {
        saving.current = false
      },
    })
  }

  return (
    <BottomSheet open onClose={onClose} label="인수인계 남기기" closeButton>
      <HandoverWriteForm
        variant="note"
        noteMeta={`${formatDate(today)} · ${storeName}`}
        requestDraft={draft.mutateAsync}
        onSave={(note) => save(note, '저장했어요. 알바생 화면에 보여요')}
        onNoIssue={() => save(NO_ISSUE, '특이사항 없음으로 저장했어요')}
        // 저장 중에는 [저장] · [특이사항 없음] 끄고 "저장 중…" (민지 #90 폼 saving)
        saving={create.isPending}
      />
    </BottomSheet>
  )
}
