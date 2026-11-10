import { toastApiError } from '@/lib/api/errors'
import { useCreateHandoverNote, useHandoverDraft } from '@/lib/api/handover'
import type { NewHandoverNote } from '@/lib/api/types'
import { HandoverWriteForm } from '@/shared/handover/HandoverWriteForm'
import { BottomSheet } from '@/ui/BottomSheet'
import { toast } from '@/ui/toastStore'

const NO_ISSUE: NewHandoverNote = { rawText: '', noIssue: true, summary: '', items: [] }

// 사장님 인수인계 남기기: 알바 시트와 같은 작성 폼(shared/handover/HandoverWriteForm · lib/api/handover)
// BE 는 사장님도 쓸 수 있다 (ensure_member). 저장하면 알바생 홈 · 인수인계 목록에 보인다
export function OwnerHandoverWriteSheet({
  storeId,
  onClose,
}: {
  storeId: string
  onClose: () => void
}) {
  const draft = useHandoverDraft(storeId)
  const create = useCreateHandoverNote(storeId)

  const save = (note: NewHandoverNote, doneMessage: string) =>
    create.mutate(note, {
      onSuccess: () => {
        onClose()
        toast(doneMessage)
      },
      onError: (error) =>
        toastApiError(error, '저장하지 못했어요. 다시 시도해 주세요', () =>
          save(note, doneMessage),
        ),
    })

  return (
    <BottomSheet open onClose={onClose} label="인수인계 남기기" closeButton>
      <HandoverWriteForm
        requestDraft={draft.mutateAsync}
        onSave={(note) => save(note, '저장했어요. 알바생 화면에 보여요')}
        onNoIssue={() => save(NO_ISSUE, '특이사항 없음으로 저장했어요')}
      />
    </BottomSheet>
  )
}
